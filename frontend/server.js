const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const net = require('net');

// CoreData stores timestamps as seconds since 2001-01-01T00:00:00Z
const COREDATA_EPOCH = new Date('2001-01-01T00:00:00Z').getTime() / 1000;

const DB_PATH = path.join(
  os.homedir(),
  'Library/Application Support/AudioFlow/AudioFlow.sqlite'
);

// Design database (separate from CoreData)
const DESIGN_DB_PATH = path.join(
  os.homedir(),
  'Library/Application Support/AudioFlow/audioflow_design.db'
);

// Config file for persistent port storage
const CONFIG_DIR = path.join(os.homedir(), '.audioflow');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SHARED_ASSETS_DIR = path.resolve(__dirname, '../AudioFlow/Assets');

// Production mode detection
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const HOST = IS_PRODUCTION ? '0.0.0.0' : 'localhost';

// Default ports
let PORT = 3000;
let WS_PORT = 3001;
let activeWss = null;

// Load or initialize config
function initConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      PORT = config.port || PORT;
      WS_PORT = config.wsPort || WS_PORT;
      return false; // loaded from file
    } catch (e) {
      // invalid JSON, continue with defaults
    }
  }
  return true; // using defaults
}

// Find available port
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, HOST, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Save config to disk
function saveConfig() {
  const config = { port: PORT, wsPort: WS_PORT, savedAt: new Date().toISOString() };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Initialize on startup
async function setupPorts() {
  const isDefault = initConfig();

  if (IS_PRODUCTION && isDefault) {
    // Find available ports in production mode
    PORT = await findAvailablePort(PORT);
    WS_PORT = await findAvailablePort(PORT + 1);
    saveConfig();
  }
}

// Default credentials (simple auth)
const DEFAULT_PASSWORD = 'audioflow123';
const DEFAULT_USERNAME = 'Lucas';

// In-memory sessions (simple auth)
const sessions = new Map();

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim() || null;
}

function getRequestToken(req) {
  const headerToken = getBearerToken(req.headers.authorization);
  if (headerToken) {
    return headerToken;
  }

  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    return requestUrl.searchParams.get('token');
  } catch (_) {
    return null;
  }
}

function getSessionForToken(token) {
  if (!token) {
    return null;
  }

  return sessions.get(token) || null;
}

// --- Express App ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/shared-assets', express.static(SHARED_ASSETS_DIR));

// --- Auth Middleware ---
function requireAuth(req, res, next) {
  const token = getRequestToken(req);
  const session = getSessionForToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.session = session;
  req.sessionToken = token;
  next();
}

function openDb() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }
  return new Database(DB_PATH, { readonly: true, fileMustExist: true });
}

// Initialize design database (separate from CoreData)
function initDesignDatabase() {
  const dbDir = path.dirname(DESIGN_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DESIGN_DB_PATH);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY,
      theme_mode TEXT DEFAULT 'dark' CHECK(theme_mode IN ('dark', 'light', 'system')),
      accent_color TEXT DEFAULT '#007AFF',
      font_size_multiplier REAL DEFAULT 1.0 CHECK(font_size_multiplier >= 0.8 AND font_size_multiplier <= 1.5),
      auto_paste_enabled INTEGER DEFAULT 1,
      sound_feedback_enabled INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transcription_id INTEGER NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#007AFF',
      icon TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transcription_tags (
      transcription_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (transcription_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_created ON favorites(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_transcription_tags ON transcription_tags(transcription_id, tag_id);
  `);

  // Insert initial preferences if not exists
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
  if (!prefs) {
    db.prepare('INSERT INTO user_preferences (id) VALUES (1)').run();
  }

  return db;
}

function coreDataTimestampToISO(ts) {
  const unixSeconds = ts + COREDATA_EPOCH;
  return new Date(unixSeconds * 1000).toISOString();
}

function parseRow(row) {
  return {
    id: row.Z_PK,
    text: String(row.ZTEXT ?? ''),
    timestamp: coreDataTimestampToISO(row.ZTIMESTAMP),
  };
}

function enrichTranscriptionsWithMetadata(transcriptions) {
  if (!transcriptions.length) {
    return transcriptions;
  }

  const db = initDesignDatabase();
  const favoriteIds = new Set(
    db.prepare('SELECT transcription_id FROM favorites').all().map((row) => row.transcription_id)
  );
  const tagRows = db.prepare(`
    SELECT
      tt.transcription_id,
      t.id,
      t.name,
      t.color,
      t.icon
    FROM transcription_tags tt
    JOIN tags t ON t.id = tt.tag_id
    ORDER BY tt.transcription_id, t.name
  `).all();
  db.close();

  const tagsByTranscriptionId = new Map();
  for (const row of tagRows) {
    const tags = tagsByTranscriptionId.get(row.transcription_id) || [];
    tags.push({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
    });
    tagsByTranscriptionId.set(row.transcription_id, tags);
  }

  return transcriptions.map((transcription) => ({
    ...transcription,
    isFavorite: favoriteIds.has(transcription.id),
    tags: tagsByTranscriptionId.get(transcription.id) || [],
  }));
}

function mapRowsWithMetadata(rows) {
  return enrichTranscriptionsWithMetadata(rows.map(parseRow));
}

function broadcast(data) {
  if (!activeWss) {
    return;
  }

  const msg = JSON.stringify(data);
  for (const client of activeWss.clients) {
    if (!client.sessionToken || !sessions.has(client.sessionToken)) {
      if (client.readyState === 0 || client.readyState === 1) {
        client.close(1008, 'Session expired');
      }
      continue;
    }

    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

function closeSessionSockets(token) {
  if (!activeWss || !token) {
    return;
  }

  for (const client of activeWss.clients) {
    if (client.sessionToken === token && (client.readyState === 0 || client.readyState === 1)) {
      client.close(1008, 'Session expired');
    }
  }
}

function createAuthenticatedWebSocketServer(port) {
  return new WebSocketServer({
    port,
    host: HOST,
    verifyClient: (info, done) => {
      const token = getRequestToken(info.req);
      const session = getSessionForToken(token);
      if (!session) {
        done(false, 401, 'Unauthorized');
        return;
      }

      info.req.session = session;
      info.req.sessionToken = token;
      done(true);
    },
  });
}

function registerWebSocketServer(wss) {
  activeWss = wss;

  wss.on('connection', (ws, req) => {
    ws.session = req.session || null;
    ws.sessionToken = req.sessionToken || null;
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
  });
}

// --- Auth Routes ---

// POST /auth/login — authenticate with password
app.post('/auth/login', (req, res) => {
  const { password } = req.body;
  if (password !== DEFAULT_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username: DEFAULT_USERNAME, loginTime: new Date() });

  res.json({ token, username: DEFAULT_USERNAME });
});

// POST /auth/logout — invalidate token
app.post('/auth/logout', requireAuth, (req, res) => {
  const token = req.sessionToken;
  sessions.delete(token);
  closeSessionSockets(token);
  res.json({ success: true });
});

// GET /auth/verify — check if token is valid
app.get('/auth/verify', (req, res) => {
  const token = getRequestToken(req);
  const session = getSessionForToken(token);
  if (session) {
    return res.json({ valid: true, username: session.username });
  }
  res.json({ valid: false });
});

// --- API Routes (protected) ---

// GET /api/runtime-config — expose dynamic client runtime configuration
app.get('/api/runtime-config', requireAuth, (req, res) => {
  res.json({ wsPort: WS_PORT });
});

// GET /api/transcriptions — list all, newest first
app.get('/api/transcriptions', requireAuth, (req, res) => {
  try {
    const db = openDb();
    const parsedLimit = parseInt(req.query.limit, 10);
    const hasLimit = Number.isFinite(parsedLimit) && parsedLimit > 0;
    const limit = hasLimit ? parsedLimit : null;
    const offset = parseInt(req.query.offset, 10) || 0;

    let rows;
    if (limit !== null) {
      rows = db.prepare(
        'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC LIMIT ? OFFSET ?'
      ).all(limit, offset);
    } else if (offset > 0) {
      rows = db.prepare(
        'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC LIMIT -1 OFFSET ?'
      ).all(offset);
    } else {
      rows = db.prepare(
        'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC'
      ).all();
    }

    const total = db.prepare('SELECT COUNT(*) as count FROM ZTRANSCRIPTION').get();

    db.close();
    res.json({
      transcriptions: mapRowsWithMetadata(rows),
      total: total.count,
      limit: limit ?? total.count,
      offset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transcriptions/search?q=term
app.get('/api/transcriptions/search', requireAuth, (req, res) => {
  try {
    const db = openDb();
    const q = String(req.query.q || '').trim();

    const rows = db.prepare(
      "SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION WHERE LOWER(COALESCE(ZTEXT, '')) LIKE LOWER(?) ORDER BY ZTIMESTAMP DESC"
    ).all(`%${q}%`);

    db.close();
    res.json({ transcriptions: mapRowsWithMetadata(rows), query: q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transcriptions/:id
app.delete('/api/transcriptions/:id', requireAuth, (req, res) => {
  res.status(405).json({ error: 'History deletion is not supported in the read-only web companion' });
});

// GET /api/transcriptions/stats — dashboard data (returns raw transcriptions for client-side filtering)
app.get('/api/transcriptions/stats', requireAuth, (req, res) => {
  try {
    const db = openDb();

    const rows = db.prepare(
      'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC'
    ).all();

    db.close();

    const transcriptions = mapRowsWithMetadata(rows);

    res.json({
      transcriptions: transcriptions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/csv — download as CSV
app.get('/api/export/csv', requireAuth, (req, res) => {
  try {
    const db = openDb();
    const rows = db.prepare(
      'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC'
    ).all();
    db.close();

    const transcriptions = rows.map(parseRow);

    // Build CSV: ID, Text, Timestamp
    let csv = 'ID,Data,Texto\n';
    for (const t of transcriptions) {
      const date = new Date(t.timestamp).toLocaleString('pt-BR');
      // Escape quotes and wrap text in quotes
      const text = `"${t.text.replace(/"/g, '""')}"`;
      csv += `${t.id},${date},${text}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audioflow-transcriptions-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/json — download as JSON
app.get('/api/export/json', requireAuth, (req, res) => {
  try {
    const db = openDb();
    const rows = db.prepare(
      'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC'
    ).all();
    db.close();

    const transcriptions = rows.map(parseRow);

    const data = {
      exported: new Date().toISOString(),
      totalCount: transcriptions.length,
      transcriptions: transcriptions,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audioflow-transcriptions-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Design Database API Routes ---

// GET /api/preferences — Get user preferences
app.get('/api/preferences', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const prefs = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
    db.close();
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/preferences — Update user preferences
app.patch('/api/preferences', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const { theme_mode, accent_color, font_size_multiplier, auto_paste_enabled, sound_feedback_enabled } = req.body;

    // Validate inputs
    const validThemes = ['dark', 'light', 'system'];
    if (theme_mode && !validThemes.includes(theme_mode)) {
      return res.status(400).json({ error: 'Invalid theme_mode' });
    }

    if (accent_color) {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      if (!hexColorRegex.test(accent_color)) {
        return res.status(400).json({ error: 'Invalid accent_color format' });
      }
    }

    if (font_size_multiplier && (font_size_multiplier < 0.8 || font_size_multiplier > 1.5)) {
      return res.status(400).json({ error: 'font_size_multiplier must be between 0.8 and 1.5' });
    }

    db.prepare(`
      UPDATE user_preferences
      SET theme_mode = COALESCE(?, theme_mode),
          accent_color = COALESCE(?, accent_color),
          font_size_multiplier = COALESCE(?, font_size_multiplier),
          auto_paste_enabled = COALESCE(?, auto_paste_enabled),
          sound_feedback_enabled = COALESCE(?, sound_feedback_enabled),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(theme_mode, accent_color, font_size_multiplier, auto_paste_enabled, sound_feedback_enabled);

    const prefs = db.prepare('SELECT * FROM user_preferences WHERE id = 1').get();
    db.close();

    broadcast({ type: 'preferences_updated', preferences: prefs });
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/favorites — List favorites
app.get('/api/favorites', requireAuth, (req, res) => {
  try {
    const coreDb = openDb();
    const designDb = initDesignDatabase();

    const favorites = designDb.prepare('SELECT transcription_id FROM favorites ORDER BY created_at DESC').all();

    const transcriptions = favorites.map(fav => {
      const t = coreDb.prepare('SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION WHERE Z_PK = ?').get(fav.transcription_id);
      return t ? parseRow(t) : null;
    }).filter(t => t !== null);

    coreDb.close();
    designDb.close();

    res.json({ favorites: enrichTranscriptionsWithMetadata(transcriptions) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/favorites/:id — Add favorite
app.post('/api/favorites/:id', requireAuth, (req, res) => {
  try {
    const coreDb = openDb();
    const designDb = initDesignDatabase();
    const id = parseInt(req.params.id);

    // Verify transcription exists
    const t = coreDb.prepare('SELECT Z_PK FROM ZTRANSCRIPTION WHERE Z_PK = ?').get(id);
    if (!t) {
      coreDb.close();
      designDb.close();
      return res.status(404).json({ error: 'Transcription not found' });
    }

    designDb.prepare('INSERT OR IGNORE INTO favorites (transcription_id) VALUES (?)').run(id);
    coreDb.close();
    designDb.close();

    broadcast({ type: 'favorite_added', id });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/favorites/:id — Remove favorite
app.delete('/api/favorites/:id', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const id = parseInt(req.params.id);

    db.prepare('DELETE FROM favorites WHERE transcription_id = ?').run(id);
    db.close();

    broadcast({ type: 'favorite_removed', id });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tags — List all tags
app.get('/api/tags', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
    db.close();
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags — Create tag
app.post('/api/tags', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const { name, color, icon } = req.body;

    if (!name || name.trim().length === 0) {
      db.close();
      return res.status(400).json({ error: 'Tag name is required' });
    }

    if (color) {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      if (!hexColorRegex.test(color)) {
        db.close();
        return res.status(400).json({ error: 'Invalid color format' });
      }
    }

    const result = db.prepare('INSERT INTO tags (name, color, icon) VALUES (?, ?, ?)').run(name.trim(), color || '#007AFF', icon || null);
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    db.close();

    broadcast({ type: 'tag_created', tag });
    res.json(tag);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Tag already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// DELETE /api/tags/:id — Delete tag
app.delete('/api/tags/:id', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const id = parseInt(req.params.id);

    db.prepare('DELETE FROM transcription_tags WHERE tag_id = ?').run(id);
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    db.close();

    broadcast({ type: 'tag_deleted', id });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transcriptions/:id/tags — Get tags for transcription
app.get('/api/transcriptions/:id/tags', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const transcriptionId = parseInt(req.params.id);

    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN transcription_tags tt ON t.id = tt.tag_id
      WHERE tt.transcription_id = ?
      ORDER BY t.name
    `).all(transcriptionId);

    db.close();
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transcriptions/:id/tags — Add tag to transcription
app.post('/api/transcriptions/:id/tags', requireAuth, (req, res) => {
  try {
    const coreDb = openDb();
    const designDb = initDesignDatabase();
    const transcriptionId = parseInt(req.params.id);
    const { tag_id } = req.body;
    const tagId = parseInt(tag_id, 10);

    if (!Number.isInteger(tagId)) {
      coreDb.close();
      designDb.close();
      return res.status(400).json({ error: 'tag_id is required' });
    }

    const transcription = coreDb.prepare('SELECT Z_PK FROM ZTRANSCRIPTION WHERE Z_PK = ?').get(transcriptionId);
    if (!transcription) {
      coreDb.close();
      designDb.close();
      return res.status(404).json({ error: 'Transcription not found' });
    }

    const tag = designDb.prepare('SELECT id FROM tags WHERE id = ?').get(tagId);
    if (!tag) {
      coreDb.close();
      designDb.close();
      return res.status(404).json({ error: 'Tag not found' });
    }

    designDb.prepare('INSERT OR IGNORE INTO transcription_tags (transcription_id, tag_id) VALUES (?, ?)').run(transcriptionId, tagId);
    coreDb.close();
    designDb.close();

    broadcast({ type: 'tag_added', transcription_id: transcriptionId, tag_id: tagId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transcriptions/:id/tags/:tag_id — Remove tag from transcription
app.delete('/api/transcriptions/:id/tags/:tag_id', requireAuth, (req, res) => {
  try {
    const db = initDesignDatabase();
    const transcriptionId = parseInt(req.params.id);
    const tagId = parseInt(req.params.tag_id);

    db.prepare('DELETE FROM transcription_tags WHERE transcription_id = ? AND tag_id = ?').run(transcriptionId, tagId);
    db.close();

    broadcast({ type: 'tag_removed', transcription_id: transcriptionId, tag_id: tagId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Static pages (client-side auth) ---
// Serve all HTML pages statically - auth is handled by client-side JavaScript (auth.js)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/favorites', (req, res) => res.sendFile(path.join(__dirname, 'favorites.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/design-system-demo.html', (req, res) => res.sendFile(path.join(__dirname, 'design-system-demo.html')));

// --- Start HTTP Server ---
async function startServer() {
  await setupPorts();

  const server = app.listen(PORT, HOST, () => {
    const protocol = IS_PRODUCTION ? 'https' : 'http';
    const accessUrl = IS_PRODUCTION
      ? `${protocol}://<your-ip>:${PORT}` // User will fill in IP
      : `http://localhost:${PORT}`;

    console.log('');
    console.log('✓ CSS built: ./dist/styles.css');
    console.log(`✓ ÁudioFlow API running at ${accessUrl}`);
    console.log(`✓ Database: ${DB_PATH}`);
    if (IS_PRODUCTION) {
      console.log(`✓ Config saved to: ${CONFIG_FILE}`);
      console.log(`✓ Listening on ${HOST}:${PORT} (external access enabled)`);
    }
    console.log('');
  });

  // --- WebSocket Server for real-time updates ---
  const wss = createAuthenticatedWebSocketServer(WS_PORT);
  registerWebSocketServer(wss);

  wss.on('error', async (err) => {
    if (err.code === 'EADDRINUSE' && IS_PRODUCTION) {
      console.log(`⚠ Port ${WS_PORT} in use, finding alternative...`);
      const newWSPort = await findAvailablePort(WS_PORT + 1);
      WS_PORT = newWSPort;
      saveConfig();
      const newWSS = createAuthenticatedWebSocketServer(WS_PORT);
      registerWebSocketServer(newWSS);
      console.log(`✓ WebSocket server started on port ${WS_PORT}`);
    } else {
      console.error('WebSocket error:', err);
    }
  });

  console.log(`WebSocket server on ws://${IS_PRODUCTION ? '<your-ip>' : 'localhost'}:${WS_PORT}`);

  // Poll for new transcriptions every 2 seconds
  let lastKnownCount = 0;
  try {
    const db = openDb();
    lastKnownCount = db.prepare('SELECT COUNT(*) as count FROM ZTRANSCRIPTION').get().count;
    db.close();
  } catch (_) {}

  setInterval(() => {
    try {
      const db = openDb();
      const { count } = db.prepare('SELECT COUNT(*) as count FROM ZTRANSCRIPTION').get();
      if (count > lastKnownCount) {
        const newRows = db.prepare(
          'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC LIMIT ?'
        ).all(count - lastKnownCount);

        broadcast({
          type: 'new_transcriptions',
          transcriptions: newRows.map(parseRow),
        });
        lastKnownCount = count;
      } else if (count < lastKnownCount) {
        broadcast({ type: 'refresh' });
        lastKnownCount = count;
      }
      db.close();
    } catch (_) {}
  }, 2000);
}

// Start server
startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
