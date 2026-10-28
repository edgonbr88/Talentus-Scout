#!/bin/sh
set -e

echo "[Entrypoint] Starting Node.js SSR server on port 4000..."
PORT=4000 node /app/dist/talentus-scout-fe/server/server.mjs &
NODE_PID=$!

echo "[Entrypoint] Starting Nginx reverse proxy..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Trap signals for graceful container shutdown
trap "kill -TERM $NODE_PID $NGINX_PID 2>/dev/null; exit 0" INT TERM EXIT

# Wait for either process to exit (POSIX compatible loop instead of non-standard wait -n)
while kill -0 "$NODE_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
    sleep 2
done

echo "[Entrypoint] A process exited unexpectedly. Terminating container..."
kill -TERM "$NODE_PID" "$NGINX_PID" 2>/dev/null || true
exit 1
