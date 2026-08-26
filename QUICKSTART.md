# Quick Start — BP-Company Template

Local development setup. Prereqs: Python 3.12, Node 24.x + npm 11, PostgreSQL 12+ (Redis optional in dev — rate-limit cache falls back to local memory).

```bash
brew install python@3.12 node postgresql@16
brew services start postgresql@16
```

## 1. Database

```bash
createdb bp_company_db
```

(Or use `./setup_database.sh` for a guided user + database setup.)

## 2. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — minimum: DJANGO_SECRET_KEY, JWT_SIGNING_KEY, DB_NAME/DB_USER/DB_PASSWORD
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

## 3. Frontend (new terminal)

```bash
cd frontend
npm install
cp .env.example .env    # defaults work for local dev
npm run dev
```

## 4. Use it

| URL | What |
|-----|------|
| http://localhost:3000 | Public site — locale-routed, redirects to `/en` or `/bn` (placeholder until BP-3) |
| http://localhost:3000/login | Staff login |
| http://localhost:3000/admin | Admin panel (requires `is_staff`) |
| http://localhost:8000/admin | Django admin |
| http://localhost:8000/api | REST API |

Staff accounts are created by admins (no public signup): `createsuperuser`, or Admin → Users.

## 5. Tests

```bash
# Backend
cd backend && source venv/bin/activate && python -m pytest

# Frontend
cd frontend && npm run lint && npm run build

# E2E (Playwright; boots Next automatically, needs the Django server running with seeded data)
cd backend && source venv/bin/activate && python manage.py seed_e2e && python manage.py runserver 8000 &
cd frontend && npm run e2e
```

## Troubleshooting

- **Port busy:** `lsof -ti:8000 | xargs kill -9` (same for 3000).
- **Migration issues:** `python manage.py showmigrations`; fresh DB: `dropdb bp_company_db && createdb bp_company_db && python manage.py migrate`.
- **Prod rate limiting:** set `USE_REDIS=true` with a shared Redis; behind a proxy set `TRUSTED_PROXY_IPS`.

Before contributing any change, read `SYNC_GATE.md` and `Master_Build_Plan.md`.
