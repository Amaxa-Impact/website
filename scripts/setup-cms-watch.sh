#!/bin/bash
# Ámaxa CMS Watch — macOS setup
# Run once: bash scripts/setup-cms-watch.sh
# This registers the watcher as a macOS LaunchAgent so it starts on login.

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_NAME="org.amaxa.cms-watch"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
NODE_PATH="$(which node)"
LOG_DIR="$HOME/Library/Logs/amaxa-cms"

echo "Ámaxa CMS Watch Setup"
echo "Repo: $REPO_DIR"
echo "Node: $NODE_PATH"
echo ""

mkdir -p "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$REPO_DIR/scripts/watch-cms.mjs</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$REPO_DIR</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$LOG_DIR/watch.log</string>

    <key>StandardErrorPath</key>
    <string>$LOG_DIR/watch-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
</dict>
</plist>
EOF

echo "LaunchAgent written to: $PLIST_PATH"

# Unload existing (ignore errors)
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Load and start
launchctl load "$PLIST_PATH"

echo ""
echo "✓ CMS watcher is now running and will start automatically on login."
echo ""
echo "Useful commands:"
echo "  View live logs:  tail -f ~/Library/Logs/amaxa-cms/watch.log"
echo "  Stop watcher:    launchctl unload $PLIST_PATH"
echo "  Start watcher:   launchctl load $PLIST_PATH"
echo "  Run sync once:   node $REPO_DIR/scripts/sync-cms.mjs"
