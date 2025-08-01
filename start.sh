#!/bin/bash
export PORT=${PORT:-4173}
echo "Starting frontend on port $PORT"
npm run preview -- --host 0.0.0.0 --port $PORT