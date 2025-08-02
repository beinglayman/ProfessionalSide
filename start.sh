#!/bin/bash
# Use Railway's PORT or default to 4173
PORT=${PORT:-4173}
echo "Starting frontend on port $PORT"
echo "Environment: NODE_ENV=${NODE_ENV}"
exec npm run preview -- --host 0.0.0.0 --port $PORT