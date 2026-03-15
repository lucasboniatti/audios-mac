# Production Deployment Checklist ✅

## 🎯 What's Been Implemented

### Server Features
- ✅ **Automatic Port Detection** - Finds available ports dynamically
- ✅ **Persistent Configuration** - Saves port config to `~/.audioflow/config.json`
- ✅ **External Access** - Binds to 0.0.0.0 instead of localhost
- ✅ **WebSocket Production Mode** - Configurable WebSocket host and port
- ✅ **Environment Detection** - Automatically detects production mode via `NODE_ENV` or `--production` flag
- ✅ **Improved Logging** - Shows full access URLs and configuration details

### Files Created/Modified

#### New Files
1. **setup-macos-startup.js** - LaunchAgent configuration script
   - Creates auto-startup LaunchAgent plist
   - Manages logs directory
   - Supports uninstall via `--uninstall` flag

2. **DEPLOYMENT.md** - Complete deployment guide
   - Quick start instructions
   - Troubleshooting guide
   - Port configuration details
   - Security considerations

3. **PRODUCTION_CHECKLIST.md** - This file

#### Modified Files
1. **server.js**
   - Added `net` module for port detection
   - Added configuration management (load/save)
   - Added `setupPorts()` async function
   - Added `findAvailablePort()` function
   - Added production mode detection
   - Refactored server startup to async `startServer()`
   - Updated WebSocket to use configurable host
   - Improved console logging

2. **package.json**
   - Added `prod` script: `NODE_ENV=production node build-css.js && node server.js --production`
   - Added `setup-startup` script: `node setup-macos-startup.js`
   - Added `remove-startup` script: `node setup-macos-startup.js --uninstall`

---

## 🚀 Quick Start

### 1. Setup Auto-Startup (One Time Only)

```bash
npm run setup-startup
```

**This will:**
- Create `~/Library/LaunchAgents/com.audioflow.server.plist`
- Create `~/.audioflow/logs/` directory
- Save configuration to `~/.audioflow/config.json`
- Register AudioFlow to start on next macOS login

### 2. Start AudioFlow Manually

```bash
npm run prod
```

**Output example:**
```
✓ CSS built: ./dist/styles.css
✓ ÁudioFlow API running at https://<your-ip>:3000
✓ Database: /Users/lucasboniatti/Library/Application Support/AudioFlow/AudioFlow.sqlite
✓ Config saved to: /Users/lucasboniatti/.audioflow/config.json
✓ Listening on 0.0.0.0:3000 (external access enabled)

WebSocket server on ws://<your-ip>:3001
```

### 3. Access from Another Device

Find your Mac's IP address:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Then open in browser:
```
http://192.168.1.100:3000  (replace with your IP)
```

---

## 📋 Configuration

### Default Credentials
- **Username:** Lucas
- **Password:** audioflow123

### Config File Location
```
~/.audioflow/config.json
```

Content:
```json
{
  "port": 3000,
  "wsPort": 3001,
  "savedAt": "2026-03-13T21:47:05.004Z"
}
```

### Log Files
```
~/.audioflow/logs/server.log     # Application logs
~/.audioflow/logs/error.log      # Error logs
```

---

## 🔧 Commands Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Development mode (localhost:3000) |
| `npm run prod` | Production mode (0.0.0.0:3000) |
| `npm run dev` | Development with auto-reload |
| `npm run setup-startup` | Setup macOS auto-startup |
| `npm run remove-startup` | Remove auto-startup |
| `npm run build:css` | Build Tailwind CSS |

---

## 📊 What Happens in Production Mode

1. **Server starts** → Checks `~/.audioflow/config.json`
2. **If new install** → Finds available port starting from 3000
3. **WebSocket port** → Always `httpPort + 1`
4. **Configuration saved** → Reused on next restart
5. **Binds to 0.0.0.0** → External network access enabled
6. **Logs created** → `~/.audioflow/logs/`

---

## 🛠️ Troubleshooting

### Check Service Status
```bash
launchctl list | grep audioflow
```

### View Live Logs
```bash
tail -f ~/.audioflow/logs/server.log
```

### Manually Start (if auto-startup fails)
```bash
npm run prod
```

### Stop Service
```bash
launchctl stop com.audioflow.server
```

### Restart Service
```bash
launchctl start com.audioflow.server
```

### Remove Auto-Startup
```bash
npm run remove-startup
```

---

## 🔐 Security Notes

⚠️ **Current Setup:**
- Simple password authentication
- No HTTPS encryption
- Designed for **local network only**

🔒 **For Internet Exposure:**
1. Change `DEFAULT_PASSWORD` in server.js
2. Use reverse proxy with HTTPS (nginx, caddy)
3. Enable firewall rules
4. Consider OAuth or better auth

---

## 📈 Monitoring

### Check if Running
```bash
# HTTP Server
netstat -an | grep 3000

# WebSocket
netstat -an | grep 3001

# Via launchctl
launchctl list | grep audioflow
```

### Monitor Transcription Count
```bash
tail -f ~/.audioflow/logs/server.log | grep "new_transcriptions"
```

---

## ✨ Next Steps

1. ✅ Run `npm run setup-startup` to enable auto-start
2. ✅ Run `npm run prod` to start server
3. ✅ Test access from another device on network
4. ✅ Check logs at `~/.audioflow/logs/server.log`
5. 🔜 Optional: Setup HTTPS reverse proxy
6. 🔜 Optional: Change default password
7. 🔜 Optional: Setup database backups

---

## 📚 Documentation

- **Full deployment guide:** See `DEPLOYMENT.md`
- **API reference:** Check server.js endpoints
- **Development guide:** See `README.md` (if exists)

---

## 🎉 Deployment Complete!

AudioFlow is now ready for production on macOS with:
- ✅ Automatic port detection
- ✅ External network access
- ✅ Auto-startup on login
- ✅ Persistent configuration
- ✅ Comprehensive logging

Happy recording! 🎙️
