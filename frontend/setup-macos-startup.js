#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Setup script for macOS launchd auto-startup
 * This creates a LaunchAgent that starts AudioFlow on login
 */

const APP_NAME = 'AudioFlow';
const PLIST_NAME = 'com.audioflow.server.plist';
const PLIST_PATH = path.join(
  os.homedir(),
  'Library/LaunchAgents',
  PLIST_NAME
);

const FRONTEND_DIR = __dirname;
const NODE_PATH = process.execPath;

function createLaunchPlist() {
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>com.audioflow.server</string>
	<key>ProgramArguments</key>
	<array>
		<string>${NODE_PATH}</string>
		<string>${path.join(FRONTEND_DIR, 'server.js')}</string>
		<string>--production</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>StandardOutPath</key>
	<string>${path.join(os.homedir(), '.audioflow/logs/server.log')}</string>
	<key>StandardErrorPath</key>
	<string>${path.join(os.homedir(), '.audioflow/logs/error.log')}</string>
	<key>WorkingDirectory</key>
	<string>${FRONTEND_DIR}</string>
	<key>EnvironmentVariables</key>
	<dict>
		<key>NODE_ENV</key>
		<string>production</string>
		<key>PATH</key>
		<string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
	</dict>
</dict>
</plist>`;

  return plistContent;
}

function setup() {
  console.log('🔧 Setting up macOS auto-startup for AudioFlow...\n');

  // Ensure LaunchAgents directory exists
  const launchAgentsDir = path.dirname(PLIST_PATH);
  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
    console.log(`✓ Created directory: ${launchAgentsDir}`);
  }

  // Ensure logs directory exists
  const logsDir = path.join(os.homedir(), '.audioflow/logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`✓ Created logs directory: ${logsDir}`);
  }

  // Create plist file
  const plistContent = createLaunchPlist();
  fs.writeFileSync(PLIST_PATH, plistContent);
  console.log(`✓ Created plist: ${PLIST_PATH}`);

  // Load the plist into launchd
  try {
    require('child_process').execSync(`launchctl load "${PLIST_PATH}"`, {
      stdio: 'inherit'
    });
    console.log('✓ Loaded into launchd (AudioFlow will start on next login)');
  } catch (err) {
    if (err.message.includes('already loaded')) {
      console.log('✓ Already loaded in launchd');
      try {
        require('child_process').execSync(`launchctl unload "${PLIST_PATH}"`, {
          stdio: 'inherit'
        });
        require('child_process').execSync(`launchctl load "${PLIST_PATH}"`, {
          stdio: 'inherit'
        });
        console.log('✓ Reloaded in launchd');
      } catch (reloadErr) {
        console.warn('⚠ Could not reload plist, but it exists');
      }
    } else {
      console.error('✗ Error loading plist:', err.message);
      process.exit(1);
    }
  }

  console.log('\n📋 Setup complete!');
  console.log('\n📖 Instructions:');
  console.log(`   1. AudioFlow will start automatically on next macOS login`);
  console.log(`   2. Check status: launchctl list | grep audioflow`);
  console.log(`   3. View logs: tail -f ~/.audioflow/logs/server.log`);
  console.log(`   4. Stop service: launchctl unload "${PLIST_PATH}"`);
  console.log(`   5. Config stored at: ~/.audioflow/config.json`);
  console.log('\n🚀 To start AudioFlow now, run: npm start -- --production');
}

// Run uninstall if --uninstall flag is passed
if (process.argv.includes('--uninstall')) {
  console.log('🔧 Uninstalling AudioFlow from macOS startup...\n');

  try {
    require('child_process').execSync(`launchctl unload "${PLIST_PATH}"`, {
      stdio: 'inherit'
    });
    console.log('✓ Unloaded from launchd');
  } catch (err) {
    if (!err.message.includes('not found')) {
      console.error('⚠ Warning:', err.message);
    }
  }

  if (fs.existsSync(PLIST_PATH)) {
    fs.unlinkSync(PLIST_PATH);
    console.log(`✓ Removed plist: ${PLIST_PATH}`);
  }

  console.log('\n✓ Uninstall complete!');
  process.exit(0);
}

// Run setup
setup();
