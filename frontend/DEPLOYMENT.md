# AudioFlow Production Deployment Guide

## Overview

AudioFlow is configured for production deployment with:
- **Cloud Sync** - Supabase backend for cloud storage
- **Automatic port detection** - finds available ports dynamically
- **External access** - binds to 0.0.0.0 for network access
- **Auto-startup** - launches on macOS login via launchd
- **Health monitoring** - `/health` and `/metrics` endpoints
- **Rate limiting** - Granular protection per endpoint

---

## Quick Start (macOS)

### 1️⃣ Setup Auto-Startup

```bash
npm run setup-startup
```

This will:
- Create a LaunchAgent configuration
- Enable auto-launch on next login
- Create logs directory at `~/.audioflow/logs/`
- Save configuration to `~/.audioflow/config.json`

### 2️⃣ Start AudioFlow (First Time)

```bash
npm run prod
```

Output will show:
```
✓ ÁudioFlow API running at http://<your-ip>:3000
✓ Config saved to: ~/.audioflow/config.json
✓ Listening on 0.0.0.0:3000 (external access enabled)
```

### 3️⃣ Access from Network

Replace `<your-ip>` with your Mac's IP address:

```bash
# Find your IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from another device
open "http://<your-ip>:3000"
```

---

## Environment Variables

### Required for Cloud Sync

Create a `.env` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Production Settings
NODE_ENV=production
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000
```

### Optional Variables

```bash
# Logging (default: INFO)
LOG_LEVEL=DEBUG|INFO|WARN|ERROR

# Rate Limiting (handled automatically)
# See server.js for granular limits per endpoint
```

---

## Health & Monitoring

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Response:
{
  "status": "ok",
  "uptime": { "seconds": 3600, "human": "1h 0m 0s" },
  "environment": "production",
  "cloud_auth": "enabled",
  "database": { "exists": true },
  "metrics": { "total_requests": 150, "total_errors": 2 }
}

# Readiness check (for Kubernetes/orchestrators)
curl http://localhost:3000/ready

# Performance metrics
curl http://localhost:3000/metrics
```

### Performance Metrics

The `/metrics` endpoint provides:

- Request counts by endpoint
- Average response times
- Error rates
- Slow request tracking (>1s)
- Sync operation statistics
- Rate limiting status

---

## Rate Limiting

### Granular Limits (per minute)

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `/api/sync/push` | 10 | Heavy write operation |
| `/api/sync/pull` | 20 | Read operation |
| `/api/cloud/transcriptions` | 60 | Frequent reads |
| `/api/transcriptions` | 60 | Frequent reads |
| `/api/cloud/tags` | 30 | Moderate usage |
| Default | 30 | All other endpoints |

### Rate Limit Headers

Every response includes:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1710523200
```

---

## Connection Pooling

### Supabase Connection Pooling

Supabase automatically handles connection pooling via **Supavisor**:

- **Transaction mode** - For serverless functions
- **Session mode** - For long-running connections
- **Pool size** - Managed automatically by Supabase

**No additional configuration needed.** The connection pool is handled at the Supabase infrastructure level.

### Connection Limits

| Plan | Connections |
|------|-------------|
| Free | 60 concurrent |
| Pro | 200 concurrent |
| Team | 500+ concurrent |

For high-traffic deployments, consider:
1. Using Supabase's connection pooling
2. Implementing Redis caching (optional, see below)

---

## Optional: Redis Caching

For production deployments with high read traffic:

### Installation

```bash
npm install redis
```

### Configuration

```javascript
// Add to server.js
const redis = require('redis');
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Cache middleware for transcriptions
async function cacheTranscriptions(req, res, next) {
  const cacheKey = `transcriptions:${req.user.id}`;
  const cached = await redisClient.get(cacheKey);

  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Store original json method
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    await redisClient.setEx(cacheKey, 300, JSON.stringify(data)); // 5 min TTL
    return originalJson(data);
  };

  next();
}
```

### Cache Invalidation

Invalidate cache on:
- New transcription sync
- Update operations
- Delete operations

---

## Configuration

### Port Configuration

Ports are automatically saved and reused:

**File:** `~/.audioflow/config.json`
```json
{
  "port": 3000,
  "wsPort": 3001,
  "savedAt": "2026-03-13T..."
}
```

### Environment Variables

```bash
# Run in production mode
NODE_ENV=production npm run prod

# Development mode
npm start

# Watch mode (auto-restart on changes)
npm run dev
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Set `NODE_ENV=production`
- [ ] Configure `.env` with Supabase credentials
- [ ] Set `ALLOWED_ORIGINS` for CORS
- [ ] Change default password in server.js
- [ ] Run `npm ci` for clean dependencies
- [ ] Run `npm audit --audit-level=high`

### Deployment

- [ ] Run `npm run prod`
- [ ] Verify `/health` returns 200
- [ ] Test cloud login functionality
- [ ] Test sync operations
- [ ] Check logs for errors

### Post-Deployment

- [ ] Monitor `/metrics` endpoint
- [ ] Set up Supabase dashboard alerts
- [ ] Configure backup monitoring
- [ ] Document any custom configurations

---

## Rollback Procedure

### Quick Rollback

```bash
# Stop the service
launchctl stop com.audioflow.server

# Revert to previous version
git checkout HEAD~1 -- frontend/server.js
git checkout HEAD~1 -- frontend/auth.js

# Restart
launchctl start com.audioflow.server
```

### Database Rollback

For Supabase issues, see `docs/operations/backup-recovery.md`.

### Full Rollback

```bash
# 1. Stop service
npm run remove-startup

# 2. Revert code
git checkout <previous-commit>

# 3. Reinstall dependencies
npm ci

# 4. Restart
npm run setup-startup
npm run prod
```

---

## Troubleshooting

### View Current Status

```bash
# Check if running
launchctl list | grep audioflow

# View logs
tail -f ~/.audioflow/logs/server.log
tail -f ~/.audioflow/logs/error.log
```

### Restart Service

```bash
# Restart
launchctl stop com.audioflow.server
launchctl start com.audioflow.server

# Or reload the plist
launchctl unload ~/Library/LaunchAgents/com.audioflow.server.plist
launchctl load ~/Library/LaunchAgents/com.audioflow.server.plist
```

### Remove Auto-Startup

```bash
npm run remove-startup
```

### Manually Start (if not auto-starting)

```bash
npm run prod
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | Server auto-detects next available port |
| Cloud auth fails | Check SUPABASE_URL and SUPABASE_ANON_KEY |
| CORS errors | Add origin to ALLOWED_ORIGINS |
| Rate limited | Wait 1 minute or check `/metrics` |

---

## Ports

### Default Ports
- **HTTP Server:** 3000 (auto-adjusts if in use)
- **WebSocket:** 3001 (port + 1)

### Finding Your IP Address

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Look for your local network IP (usually 192.168.x.x or 10.x.x.x)
```

---

## API Access

### From Local Network (Recommended)

```bash
# Replace YYYY.YYYY.YYYY.YYYY with your Mac's IP
curl http://192.168.1.100:3000/login.html

# Or open in browser
open "http://192.168.1.100:3000"
```

### Default Credentials

- **Username:** Lucas
- **Password:** audioflow123

⚠️ **Change default password before production deployment!**

---

## Logs

Logs are stored at `~/.audioflow/logs/`:

```bash
# View server logs
tail -f ~/.audioflow/logs/server.log

# View error logs
tail -f ~/.audioflow/logs/error.log

# Clear old logs
rm ~/.audioflow/logs/*.log
```

### Structured Logging Format

```json
{
  "timestamp": "2026-03-15T14:51:00.000Z",
  "level": "INFO",
  "message": "Request completed",
  "method": "GET",
  "path": "/api/transcriptions",
  "status": 200,
  "duration_ms": 45
}
```

---

## Database

### Local SQLite

Database file location:
```
~/Library/Application Support/AudioFlow/AudioFlow.sqlite
```

The server is **read-only** by default. Changes (deletes) are tracked but require special permissions.

### Cloud Database (Supabase)

- **Hosted:** PostgreSQL via Supabase
- **Backups:** Automatic daily backups (7-day retention)
- **See:** `docs/operations/backup-recovery.md`

---

## Security Notes

🔒 **Current Setup:**
- JWT-based authentication for cloud mode
- Simple password auth for local mode
- Rate limiting enabled
- Input validation enabled
- CORS configured for production

⚠️ **For Internet Exposure:**
1. Change `DEFAULT_PASSWORD` in server.js
2. Use reverse proxy with HTTPS (nginx, caddy, etc.)
3. Set `ALLOWED_ORIGINS` to your domain only
4. Consider more robust authentication
5. Enable firewall rules

---

## Advanced: Manual Configuration

If auto-startup isn't working, manually create the LaunchAgent:

1. Create file: `~/Library/LaunchAgents/com.audioflow.server.plist`

2. Get your Node.js path:
```bash
which node
# /usr/local/bin/node
```

3. Edit the plist and set ProgramArguments to match your path

4. Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.audioflow.server.plist
```

---

## Files Modified

- `server.js` - Added port detection, config management, health/metrics endpoints
- `auth.js` - Added retry logic, cloud sync methods
- `package.json` - Added `prod`, `setup-startup`, `remove-startup` scripts
- `setup-macos-startup.js` - New setup script
- `DEPLOYMENT.md` - This file

---

## What's Next?

✅ Production deployment ready
✅ Auto-startup configured
✅ External access enabled
✅ Port configuration persisted
✅ Cloud sync with Supabase
✅ Health monitoring enabled
✅ Rate limiting configured

**Next steps:**
1. Test from another device on your network
2. Configure firewall if needed
3. Set up HTTPS reverse proxy for internet access
4. Monitor logs and `/metrics` regularly

---

For issues, check logs at `~/.audioflow/logs/server.log`
