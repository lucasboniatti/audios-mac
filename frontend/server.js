const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const net = require('net');
const { createClient } = require('@supabase/supabase-js');

// Load .env from project root
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// --- Granular Rate Limiting ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Rate limits per endpoint
const RATE_LIMITS = {
  '/api/sync/push': { max: 10, window: 60000 },      // 10/min - heavy operation
  '/api/sync/pull': { max: 20, window: 60000 },      // 20/min - read operation
  '/api/cloud/transcriptions': { max: 60, window: 60000 }, // 60/min - frequent reads
  '/api/transcriptions': { max: 60, window: 60000 }, // 60/min - frequent reads
  '/api/cloud/tags': { max: 30, window: 60000 },     // 30/min - moderate
  'default': { max: 30, window: 60000 }              // 30/min default
};

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Get endpoint-specific limit
  const endpoint = Object.keys(RATE_LIMITS).find(key => req.path.startsWith(key));
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
  const { max: maxRequests, window } = config;

  const key = `${ip}:${endpoint || 'default'}`;
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + window };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + window;
  }

  entry.count++;
  rateLimitMap.set(key, entry);

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

  if (entry.count > maxRequests) {
    log('WARN', 'Rate limit exceeded', { ip, path: req.path, count: entry.count });
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment.',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    });
  }

  next();
}

// --- Input Validation ---
const MAX_TEXT_LENGTH = 100000; // 100KB max text
const MAX_TRANSCRIPTIONS_PER_SYNC = 100;

function validateSyncInput(req, res, next) {
  const { transcriptions } = req.body;

  if (!Array.isArray(transcriptions)) {
    return res.status(400).json({ error: 'transcriptions must be an array' });
  }

  if (transcriptions.length > MAX_TRANSCRIPTIONS_PER_SYNC) {
    return res.status(400).json({
      error: `Too many transcriptions. Maximum ${MAX_TRANSCRIPTIONS_PER_SYNC} per batch.`
    });
  }

  for (const t of transcriptions) {
    if (t.text && t.text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters.`
      });
    }
  }

  next();
}

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

// --- Structured Logging ---
const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

function log(level, message, data = {}) {
  if (LOG_LEVELS[level] > LOG_LEVEL) return;
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...data };
  console.log(JSON.stringify(logEntry));
}

// Request timing middleware
function requestTimer(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Track performance metrics
    if (typeof trackPerformance === 'function') {
      trackPerformance(req, res, duration);
    }

    log('INFO', 'Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration
    });
  });
  next();
}

// Application start time for health check
const APP_START_TIME = new Date();
let requestCount = 0;
let errorCount = 0;

// --- Performance Monitoring ---
const performanceMetrics = {
  requests: {
    total: 0,
    byEndpoint: {},
    errors: 0,
    slowRequests: []
  },
  sync: {
    pushCount: 0,
    pullCount: 0,
    avgPushTime: 0,
    avgPullTime: 0,
    totalPushTime: 0,
    totalPullTime: 0
  },
  database: {
    queryCount: 0,
    totalTime: 0
  }
};

// Track slow requests (over 1 second)
const SLOW_REQUEST_THRESHOLD_MS = 1000;
const MAX_SLOW_REQUESTS_STORED = 50;

function trackPerformance(req, res, duration) {
  const endpoint = req.path;

  // Update request count by endpoint
  if (!performanceMetrics.requests.byEndpoint[endpoint]) {
    performanceMetrics.requests.byEndpoint[endpoint] = { count: 0, totalTime: 0, errors: 0 };
  }
  performanceMetrics.requests.byEndpoint[endpoint].count++;
  performanceMetrics.requests.byEndpoint[endpoint].totalTime += duration;

  // Track slow requests
  if (duration > SLOW_REQUEST_THRESHOLD_MS) {
    const slowRequest = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: endpoint,
      duration_ms: duration,
      statusCode: res.statusCode
    };

    performanceMetrics.requests.slowRequests.push(slowRequest);

    // Keep only last N slow requests
    if (performanceMetrics.requests.slowRequests.length > MAX_SLOW_REQUESTS_STORED) {
      performanceMetrics.requests.slowRequests.shift();
    }

    log('WARN', 'Slow request detected', slowRequest);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CLOUD_AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabaseAnonClient = CLOUD_AUTH_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
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

function runAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

async function authenticateSupabaseToken(token) {
  if (!CLOUD_AUTH_ENABLED || !token) {
    return null;
  }

  const { data, error } = await supabaseAnonClient.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return { user: data.user, client };
}

async function resolveSessionFromToken(token) {
  if (!token) {
    return null;
  }

  const supabaseSession = await authenticateSupabaseToken(token);
  if (supabaseSession) {
    return {
      type: 'cloud',
      supabaseClient: supabaseSession.client,
      user: supabaseSession.user,
    };
  }

  const session = getSessionForToken(token);
  if (session) {
    return {
      type: 'local',
      session,
    };
  }

  return null;
}

// --- Express App ---
const app = express();
// --- CORS Configuration ---
const corsOptions = IS_PRODUCTION
  ? {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestTimer);
app.use(express.static(__dirname));
app.use('/shared-assets', express.static(SHARED_ASSETS_DIR));

// Track request counts
app.use((req, res, next) => {
  requestCount++;
  res.on('finish', () => {
    if (res.statusCode >= 400) errorCount++;
  });
  next();
});

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - APP_START_TIME.getTime()) / 1000);
  const dbExists = fs.existsSync(DB_PATH);

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      human: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`
    },
    version: '1.0.0',
    environment: IS_PRODUCTION ? 'production' : 'development',
    cloud_auth: CLOUD_AUTH_ENABLED ? 'enabled' : 'disabled',
    database: {
      path: DB_PATH,
      exists: dbExists
    },
    metrics: {
      total_requests: requestCount,
      total_errors: errorCount
    }
  };

  // Check Supabase connectivity if cloud auth is enabled
  if (CLOUD_AUTH_ENABLED && supabaseAnonClient) {
    health.supabase = {
      url: SUPABASE_URL,
      status: 'configured'
    };
  }

  const isHealthy = dbExists;
  res.status(isHealthy ? 200 : 503).json(health);
});

// --- Readiness Check for Kubernetes/orchestrators ---
app.get('/ready', (req, res) => {
  const dbExists = fs.existsSync(DB_PATH);
  res.status(dbExists ? 200 : 503).json({
    ready: dbExists,
    checks: {
      database: dbExists ? 'pass' : 'fail'
    }
  });
});

// --- Performance Metrics Endpoint ---
app.get('/metrics', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - APP_START_TIME.getTime()) / 1000);

  // Calculate average response times by endpoint
  const endpointStats = {};
  for (const [endpoint, data] of Object.entries(performanceMetrics.requests.byEndpoint)) {
    endpointStats[endpoint] = {
      count: data.count,
      avgTime_ms: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      errors: data.errors
    };
  }

  const metrics = {
    uptime_seconds: uptimeSeconds,
    requests: {
      total: performanceMetrics.requests.total,
      by_endpoint: endpointStats,
      errors: performanceMetrics.requests.errors,
      error_rate: performanceMetrics.requests.total > 0
        ? ((performanceMetrics.requests.errors / performanceMetrics.requests.total) * 100).toFixed(2) + '%'
        : '0%'
    },
    slow_requests: {
      threshold_ms: SLOW_REQUEST_THRESHOLD_MS,
      count: performanceMetrics.requests.slowRequests.length,
      recent: performanceMetrics.requests.slowRequests.slice(-10)
    },
    sync: {
      push_count: performanceMetrics.sync.pushCount,
      pull_count: performanceMetrics.sync.pullCount,
      avg_push_time_ms: performanceMetrics.sync.pushCount > 0
        ? Math.round(performanceMetrics.sync.totalPushTime / performanceMetrics.sync.pushCount)
        : 0,
      avg_pull_time_ms: performanceMetrics.sync.pullCount > 0
        ? Math.round(performanceMetrics.sync.totalPullTime / performanceMetrics.sync.pullCount)
        : 0
    },
    rate_limiting: {
      active_ips: rateLimitMap.size,
      limits: RATE_LIMITS
    },
    timestamp: new Date().toISOString()
  };

  res.json(metrics);
});

// --- Auth Middleware ---
const requireAuth = runAsync(async (req, res, next) => {
  const token = getRequestToken(req);
  const context = await resolveSessionFromToken(token);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.sessionToken = token;
  if (context.type === 'cloud') {
    req.session = { type: 'cloud', username: context.user.email };
    req.user = context.user;
    req.supabase = context.supabaseClient;
  } else {
    req.session = context.session;
  }

  next();
});

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
      resolveSessionFromToken(token)
        .then((context) => {
          if (!context) {
            done(false, 401, 'Unauthorized');
            return;
          }

          info.req.sessionToken = token;
          if (context.type === 'cloud') {
            info.req.session = { type: 'cloud', username: context.user.email };
            info.req.supabase = context.supabaseClient;
            info.req.user = context.user;
          } else {
            info.req.session = context.session;
          }

          done(true);
        })
        .catch(() => done(false, 401, 'Unauthorized'));
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
app.post('/auth/logout', requireAuth, runAsync(async (req, res) => {
  const token = req.sessionToken;
  if (req.supabase) {
    try {
      await req.supabase.auth.signOut();
    } catch (_) {}
  }

  if (token && sessions.has(token)) {
    sessions.delete(token);
  }

  closeSessionSockets(token);
  res.json({ success: true });
}));

// GET /auth/verify — check if token is valid
app.get('/auth/verify', runAsync(async (req, res) => {
  const token = getRequestToken(req);
  const context = await resolveSessionFromToken(token);
  if (context) {
    const username = context.type === 'cloud'
      ? context.user?.email
      : context.session?.username;
    return res.json({ valid: true, username });
  }
  res.json({ valid: false });
}));

// --- API Routes (protected) ---

// GET /api/runtime-config — expose dynamic client runtime configuration
app.get('/api/runtime-config', (req, res) => {
  res.json({
    wsPort: WS_PORT,
    cloudAuth: {
      enabled: CLOUD_AUTH_ENABLED,
      supabaseUrl: CLOUD_AUTH_ENABLED ? SUPABASE_URL : null,
      supabaseAnonKey: CLOUD_AUTH_ENABLED ? SUPABASE_ANON_KEY : null,
    },
  });
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

// --- Cloud API Routes (Supabase) ---

// GET /api/profile — Get user profile (cloud mode only)
app.get('/api/profile', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Profile only available in cloud mode' });
  }

  const { data, error } = await req.supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || { id: req.user.id, email: req.user.email });
}));

// PATCH /api/profile — Update user profile (cloud mode only)
app.patch('/api/profile', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Profile only available in cloud mode' });
  }

  const { full_name, preferences } = req.body;

  const updateData = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) updateData.full_name = full_name;
  if (preferences !== undefined) updateData.preferences = preferences;

  const { data, error } = await req.supabase
    .from('profiles')
    .update(updateData)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
}));

// POST /api/profile/avatar — Upload avatar (cloud mode only)
app.post('/api/profile/avatar', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Avatar upload only available in cloud mode' });
  }

  // For now, return error - file upload requires multipart handling
  res.status(501).json({ error: 'Avatar upload not yet implemented. Use Supabase dashboard.' });
}));

// --- Cloud Sync Routes ---

// GET /api/sync/status — Get sync status
app.get('/api/sync/status', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.json({ cloudEnabled: false, mode: 'local' });
  }

  const { count: transcriptionCount, error } = await req.supabase
    .from('transcriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    cloudEnabled: true,
    mode: 'cloud',
    cloudTranscriptions: transcriptionCount || 0
  });
}));

// POST /api/sync/push — Push local transcriptions to cloud
app.post('/api/sync/push', rateLimit, validateSyncInput, requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Sync only available in cloud mode' });
  }

  const { transcriptions } = req.body;
  if (!Array.isArray(transcriptions) || transcriptions.length === 0) {
    return res.status(400).json({ error: 'No transcriptions provided' });
  }

  const results = { synced: 0, conflicts: 0, errors: [] };

  for (const t of transcriptions) {
    try {
      // Check if transcription already exists
      const { data: existing } = await req.supabase
        .from('transcriptions')
        .select('id, version')
        .eq('user_id', req.user.id)
        .eq('local_id', t.local_id)
        .maybeSingle();

      if (existing) {
        // Update existing (with version check for conflict detection)
        const { error: updateError } = await req.supabase
          .from('transcriptions')
          .update({
            text: t.text,
            timestamp: t.timestamp,
            version: existing.version + 1,
            source_updated_at: new Date().toISOString(),
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .eq('version', existing.version);

        if (updateError) {
          // Version mismatch = conflict
          if (updateError.code === 'PGRST116') {
            results.conflicts++;
            // Record conflict
            await req.supabase.from('sync_conflicts').insert({
              user_id: req.user.id,
              transcription_id: existing.id,
              local_version: t.version || 1,
              remote_version: existing.version,
              local_payload: t,
              remote_payload: existing
            });
          } else {
            results.errors.push({ local_id: t.local_id, error: updateError.message });
          }
        } else {
          results.synced++;
        }
      } else {
        // Insert new
        const { error: insertError } = await req.supabase
          .from('transcriptions')
          .insert({
            user_id: req.user.id,
            local_id: t.local_id,
            text: t.text,
            timestamp: t.timestamp,
            version: 1,
            source_updated_at: new Date().toISOString(),
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });

        if (insertError) {
          results.errors.push({ local_id: t.local_id, error: insertError.message });
        } else {
          results.synced++;
        }
      }
    } catch (err) {
      results.errors.push({ local_id: t.local_id, error: err.message });
    }
  }

  res.json(results);
}));

// GET /api/sync/pull — Pull cloud transcriptions
app.get('/api/sync/pull', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Sync only available in cloud mode' });
  }

  const { data, error } = await req.supabase
    .from('transcriptions')
    .select('*')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ transcriptions: data || [] });
}));

// GET /api/cloud/transcriptions — List transcriptions from cloud
app.get('/api/cloud/transcriptions', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Cloud transcriptions only available in cloud mode' });
  }

  const startDate = req.query.start;
  const endDate = req.query.end;
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  let query = req.supabase
    .from('transcriptions')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate) {
    query = query.gte('timestamp', startDate);
  }
  if (endDate) {
    query = query.lt('timestamp', endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    transcriptions: data || [],
    total: count || 0,
    limit,
    offset
  });
}));

// GET /api/cloud/stats — Dashboard stats from cloud
app.get('/api/cloud/stats', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Cloud stats only available in cloud mode' });
  }

  const { data, error } = await req.supabase
    .from('transcriptions')
    .select('text, timestamp')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ transcriptions: data || [] });
}));

// --- Cloud Tags & Favorites ---

// GET /api/cloud/tags — List tags from cloud
app.get('/api/cloud/tags', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Cloud tags only available in cloud mode' });
  }

  const { data, error } = await req.supabase
    .from('tags')
    .select('*')
    .eq('user_id', req.user.id)
    .order('name');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ tags: data || [] });
}));

// POST /api/cloud/tags — Create tag in cloud
app.post('/api/cloud/tags', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Cloud tags only available in cloud mode' });
  }

  const { name, color } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  const { data, error } = await req.supabase
    .from('tags')
    .insert({
      user_id: req.user.id,
      name: name.trim(),
      color: color || '#007AFF'
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
}));

// DELETE /api/cloud/tags/:id — Delete tag from cloud
app.delete('/api/cloud/tags/:id', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Cloud tags only available in cloud mode' });
  }

  const tagId = req.params.id;

  const { error } = await req.supabase
    .from('tags')
    .delete()
    .eq('id', tagId)
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
}));

// PATCH /api/cloud/transcriptions/:id — Update transcription in cloud (favorite, tags)
app.patch('/api/cloud/transcriptions/:id', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Cloud transcriptions only available in cloud mode' });
  }

  const transcriptionId = req.params.id;
  const { is_favorite, tags } = req.body;

  const updateData = { updated_at: new Date().toISOString() };
  if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
  if (tags !== undefined) updateData.tags = tags;

  const { data, error } = await req.supabase
    .from('transcriptions')
    .update(updateData)
    .eq('id', transcriptionId)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Transcription not found' });
  }

  res.json(data);
}));

// POST /api/sync/push-metadata — Push local favorites/tags to cloud
app.post('/api/sync/push-metadata', requireAuth, runAsync(async (req, res) => {
  if (!req.supabase) {
    return res.status(400).json({ error: 'Sync only available in cloud mode' });
  }

  const { favorites, tags, transcriptionTags } = req.body;
  const results = { favorites: 0, tags: 0, associations: 0, errors: [] };

  // Sync tags
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      try {
        const { error } = await req.supabase
          .from('tags')
          .upsert({
            user_id: req.user.id,
            name: tag.name,
            color: tag.color || '#007AFF'
          }, { onConflict: 'user_id,name' });

        if (!error) {
          results.tags++;
        } else {
          results.errors.push({ type: 'tag', name: tag.name, error: error.message });
        }
      } catch (err) {
        results.errors.push({ type: 'tag', name: tag.name, error: err.message });
      }
    }
  }

  // Sync favorites - update transcriptions
  if (Array.isArray(favorites)) {
    for (const fav of favorites) {
      try {
        const { error } = await req.supabase
          .from('transcriptions')
          .update({ is_favorite: true })
          .eq('user_id', req.user.id)
          .eq('local_id', fav.local_id);

        if (!error) {
          results.favorites++;
        }
      } catch (err) {
        results.errors.push({ type: 'favorite', local_id: fav.local_id, error: err.message });
      }
    }
  }

  res.json(results);
}));

// --- Static pages (client-side auth) ---
// Serve all HTML pages statically - auth is handled by client-side JavaScript (auth.js)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/favorites', (req, res) => res.sendFile(path.join(__dirname, 'favorites.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/signup.html', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
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
