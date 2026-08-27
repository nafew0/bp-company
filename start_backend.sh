#!/usr/bin/env bash
# Start the Django backend (http://localhost:8000)
set -e
cd "$(dirname "$0")/backend"
source venv/bin/activate
python manage.py runserver 8000
