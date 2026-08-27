#!/usr/bin/env bash
# Start the Next.js frontend (http://localhost:3000)
set -e
cd "$(dirname "$0")/frontend"
npm run dev
