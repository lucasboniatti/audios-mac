const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { WebSocketServer } = require('ws');

// CoreData stores timestamps as seconds since 2001-01-01T00:00:00Z
const COREDATA_EPOCH = new Date('2001-01-01T00:00:00Z').getTime() / 1000;

const DB_PATH = path.join(
  os.homedir(),
  'Library/Application Support/AudioFlow/AudioFlow.sqlite'
);

const PORT = 3000;
const WS_PORT = 3001;

// --- Express App ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function openDb() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }
  return new Database(DB_PATH, { readonly: true, fileMustExist: true });
}

function coreDataTimestampToISO(ts) {
  const unixSeconds = ts + COREDATA_EPOCH;
  return new Date(unixSeconds * 1000).toISOString();
}

function parseRow(row) {
  return {
    id: row.Z_PK,
    text: row.ZTEXT,
    timestamp: coreDataTimestampToISO(row.ZTIMESTAMP),
  };
}

// --- API Routes ---

// GET /api/transcriptions — list all, newest first
app.get('/api/transcriptions', (req, res) => {
  try {
    const db = openDb();
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const rows = db.prepare(
      'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM ZTRANSCRIPTION').get();

    db.close();
    res.json({
      transcriptions: rows.map(parseRow),
      total: total.count,
      limit,
      offset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transcriptions/search?q=term
app.get('/api/transcriptions/search', (req, res) => {
  try {
    const db = openDb();
    const q = req.query.q || '';

    const rows = db.prepare(
      'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION WHERE ZTEXT LIKE ? ORDER BY ZTIMESTAMP DESC'
    ).all(`%${q}%`);

    db.close();
    res.json({ transcriptions: rows.map(parseRow), query: q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transcriptions/stats — dashboard data
app.get('/api/transcriptions/stats', (req, res) => {
  try {
    const db = openDb();

    const rows = db.prepare(
      'SELECT Z_PK, ZTEXT, ZTIMESTAMP FROM ZTRANSCRIPTION ORDER BY ZTIMESTAMP DESC'
    ).all();

    db.close();

    const transcriptions = rows.map(parseRow);

    // Total words
    let totalWords = 0;
    const wordFreq = {};

    // Words per day (last 7 days)
    const now = new Date();
    const dailyWords = {};
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (const t of transcriptions) {
      const words = t.text.split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;

      // Word frequency (only words with 4+ chars, lowercase, no punctuation)
      for (const raw of words) {
        const w = raw.toLowerCase().replace(/[^a-záàãâéêíóôõúüç]/g, '');
        if (w.length >= 4) {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
        }
      }

      // Daily word count
      const date = new Date(t.timestamp);
      const dayKey = date.toISOString().split('T')[0];
      dailyWords[dayKey] = (dailyWords[dayKey] || 0) + words.length;
    }

    // Last 7 days chart data
    const weeklyChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      weeklyChart.push({
        day: dayNames[d.getDay()],
        date: key,
        words: dailyWords[key] || 0,
        isToday: i === 0,
      });
    }

    // Top words sorted by frequency
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word, count]) => ({ word, count }));

    // Average daily (last 7 days)
    const last7 = weeklyChart.reduce((sum, d) => sum + d.words, 0);
    const avgDaily = Math.round(last7 / 7);

    // Trend (compare this week vs prior totals)
    const totalDays = Object.keys(dailyWords).length || 1;
    const overallAvg = Math.round(totalWords / totalDays);
    const trendPct = overallAvg > 0 ? Math.round(((avgDaily - overallAvg) / overallAvg) * 100) : 0;

    res.json({
      totalWords,
      totalTranscriptions: transcriptions.length,
      avgDaily,
      trendPct,
      weeklyChart,
      topWords,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Static pages ---
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/dashboard', (_req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// --- Start HTTP Server ---
const server = app.listen(PORT, () => {
  console.log(`ÁudioFlow API running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});

// --- WebSocket Server for real-time updates ---
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

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

console.log(`WebSocket server on ws://localhost:${WS_PORT}`);
