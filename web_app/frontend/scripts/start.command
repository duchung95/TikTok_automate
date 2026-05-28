#!/bin/bash
# FlashPod launcher — double-click this file to start the app.
# Requires macOS (Python 3 is built-in since macOS 12.3).

cd "$(dirname "$0")"

PORT=3000

# If already running, just open the browser
if lsof -i :"$PORT" &>/dev/null; then
  echo "Server already running. Opening browser..."
  open "http://localhost:$PORT"
  exit 0
fi

echo "Starting FlashPod on http://localhost:$PORT ..."

# Start server in background
python3 -m http.server "$PORT" &
SERVER_PID=$!

# Wait until the server is ready (up to 5 seconds)
for i in {1..10}; do
  if curl -s "http://localhost:$PORT" &>/dev/null; then
    break
  fi
  sleep 0.5
done

open "http://localhost:$PORT"
echo "App is running. Close this window to stop the server."

# Keep Terminal open — server stays alive until this window is closed
wait $SERVER_PID
