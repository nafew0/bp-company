#!/usr/bin/env bash
#
# BP-Company — new project generator.
#
# Creates a fresh client project from this template working tree, with the
# project name, package name, database and site name substituted dynamically
# (bp_company / bp-company / BP-Company -> your names).
#
# Interactive:      ./setup.sh
# Non-interactive:  ./setup.sh --name acmeco --display "AcmeCo" \
#                     --dir "/path/to/acmeco" --db-name acmeco_db \
#                     --db-user "$(whoami)" --db-password "" \
#                     [--origin https://github.com/you/acmeco.git] \
#                     [--seed-demo] [--skip-install] [--no-db]
#
set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_REMOTE="https://github.com/nafew0/bp-company.git"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${BLUE}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[ ok ]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
fail()    { echo -e "${RED}[fail]${NC} $*"; exit 1; }

# ---------------------------------------------------------------- arguments
PROJECT_NAME=""; DISPLAY_NAME=""; PROJECT_DIR=""; DB_NAME=""; DB_USER=""; DB_PASSWORD=""
DB_HOST="localhost"; DB_PORT="5432"; ORIGIN_URL=""; SEED_DEMO="ask"; SKIP_INSTALL=0; CREATE_DB=1

while [ $# -gt 0 ]; do
  case "$1" in
    --name) PROJECT_NAME="$2"; shift 2 ;;
    --display) DISPLAY_NAME="$2"; shift 2 ;;
    --dir) PROJECT_DIR="$2"; shift 2 ;;
    --db-name) DB_NAME="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-password) DB_PASSWORD="$2"; shift 2 ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --origin) ORIGIN_URL="$2"; shift 2 ;;
    --seed-demo) SEED_DEMO="yes"; shift ;;
    --no-seed-demo) SEED_DEMO="no"; shift ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --no-db) CREATE_DB=0; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done

# ----------------------------------------------------------------- prompts
if [ -z "$PROJECT_NAME" ]; then
  read -r -p "$(echo -e "${BLUE}Project name (python identifier, e.g. acmeco): ${NC}")" PROJECT_NAME
fi
[[ "$PROJECT_NAME" =~ ^[a-z_][a-z0-9_]*$ ]] || fail "Project name must be a lowercase python identifier (a-z, 0-9, _)."
[ "$PROJECT_NAME" = "bp_company" ] && fail "Pick a name different from bp_company."

KEBAB_NAME="${PROJECT_NAME//_/-}"

if [ -z "$DISPLAY_NAME" ]; then
  read -r -p "$(echo -e "${BLUE}Display name [${PROJECT_NAME}]: ${NC}")" DISPLAY_NAME
  DISPLAY_NAME="${DISPLAY_NAME:-$PROJECT_NAME}"
fi

DEFAULT_DIR="$(dirname "$TEMPLATE_DIR")/$KEBAB_NAME"
if [ -z "$PROJECT_DIR" ]; then
  read -r -p "$(echo -e "${BLUE}Project directory [${DEFAULT_DIR}]: ${NC}")" PROJECT_DIR
  PROJECT_DIR="${PROJECT_DIR:-$DEFAULT_DIR}"
fi
[ -e "$PROJECT_DIR" ] && fail "Target already exists: $PROJECT_DIR"

if [ -z "$DB_NAME" ]; then
  read -r -p "$(echo -e "${BLUE}Database name [${PROJECT_NAME}_db]: ${NC}")" DB_NAME
  DB_NAME="${DB_NAME:-${PROJECT_NAME}_db}"
fi
if [ -z "$DB_USER" ]; then
  read -r -p "$(echo -e "${BLUE}Database user [$(whoami)]: ${NC}")" DB_USER
  DB_USER="${DB_USER:-$(whoami)}"
fi
if [ -z "${DB_PASSWORD+x}" ] || { [ -z "$DB_PASSWORD" ] && [ -t 0 ] && [ "$SEED_DEMO" = "ask" ]; }; then
  read -r -s -p "$(echo -e "${BLUE}Database password (empty for local trust auth): ${NC}")" DB_PASSWORD || true
  echo
fi
if [ "$SEED_DEMO" = "ask" ]; then
  read -r -p "$(echo -e "${BLUE}Seed the Acme demo content? [y/N]: ${NC}")" ANSWER
  case "${ANSWER:-n}" in y|Y) SEED_DEMO="yes" ;; *) SEED_DEMO="no" ;; esac
fi

TEMPLATE_COMMIT="$(git -C "$TEMPLATE_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"

echo
info "Project:   $PROJECT_NAME (display: $DISPLAY_NAME)"
info "Directory: $PROJECT_DIR"
info "Database:  $DB_NAME as $DB_USER@$DB_HOST:$DB_PORT"
info "Template:  bp-company @ $TEMPLATE_COMMIT"
echo

# ------------------------------------------------- copy + rename + substitute
info "Copying template files..."
mkdir -p "$PROJECT_DIR"
rsync -a \
  --exclude '.git' \
  --exclude 'backend/venv' \
  --exclude 'backend/.env' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/.env' \
  --exclude 'frontend/.next' \
  --exclude 'frontend/playwright-report' \
  --exclude 'frontend/test-results' \
  --exclude 'backend/media' \
  --exclude '__pycache__' \
  --exclude '.DS_Store' \
  --exclude 'setup.sh' \
  "$TEMPLATE_DIR/" "$PROJECT_DIR/"

mv "$PROJECT_DIR/backend/bp_company" "$PROJECT_DIR/backend/$PROJECT_NAME"

info "Substituting project names..."
python3 - "$PROJECT_DIR" "$PROJECT_NAME" "$KEBAB_NAME" "$DISPLAY_NAME" <<'PY'
from pathlib import Path
import sys

project_dir = Path(sys.argv[1])
snake, kebab, display = sys.argv[2], sys.argv[3], sys.argv[4]

ALLOWED = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".html", ".md", ".mjs",
           ".cjs", ".sh", ".cmd", ".env", ".yml", ".yaml", ".ini", ".cfg",
           ".css", ".txt"}
# These reference the actual upstream template repo — keep them accurate.
SKIP_NAMES = {"Master_Build_Plan.md", "SYNC_GATE.md", "SYNC_LOG.md", "TEMPLATE_VERSION"}

changed = 0
for path in project_dir.rglob("*"):
    if not path.is_file() or path.name in SKIP_NAMES:
        continue
    if not (path.name.startswith(".env") or path.suffix in ALLOWED):
        continue
    try:
        content = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    updated = (content
               .replace("bp_company", snake)
               .replace("bp-company", kebab)
               .replace("BP-Company", display))
    if updated != content:
        path.write_text(updated, encoding="utf-8")
        changed += 1
print(f"  substituted in {changed} files")
PY
success "Files copied and renamed"

# --------------------------------------------------------------- env files
info "Generating .env files..."
DJANGO_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
JWT_SIGNING_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"

cat > "$PROJECT_DIR/backend/.env" <<EOF
# Django settings
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
JWT_SIGNING_KEY=$JWT_SIGNING_KEY
DEBUG=True
ENVIRONMENT=development
APP_ORIGIN=http://localhost:3000
PUBLIC_APP_URL=http://localhost:3000
API_ORIGIN=http://localhost:8000
TRUST_X_FORWARDED_PROTO=False

# Database
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT

# Redis / Celery (optional in dev)
USE_REDIS=False
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CELERY_BROKER_URL=redis://127.0.0.1:6379/2
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/2

# Email — console backend in dev
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=no-reply@example.com

# Leads
LEADS_REFERENCE_PREFIX=LD

# Dev throttle overrides (production uses strict defaults)
CONTACT_THROTTLE_RATE=1000/hour
LEAD_CAPTURE_THROTTLE_RATE=1000/hour
ADMIN_API_THROTTLE_RATE=5000/hour
EOF

cat > "$PROJECT_DIR/frontend/.env" <<EOF
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_DJANGO_ADMIN_URL=http://localhost:8000/admin
NEXT_PUBLIC_ENABLE_STYLEGUIDE=1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
success ".env files written (secrets generated)"

# ------------------------------------------------------------------ database
if [ "$CREATE_DB" -eq 1 ]; then
  info "Creating database $DB_NAME..."
  if command -v createdb >/dev/null 2>&1; then
    if PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
      success "Database created"
    else
      warn "Could not create $DB_NAME (it may already exist, or auth failed)."
      warn "Create it manually if needed: createdb $DB_NAME  (or use ./setup_database.sh)"
    fi
  else
    warn "createdb not found — create the database manually before migrating."
  fi
fi

# -------------------------------------------------------------- install/run
if [ "$SKIP_INSTALL" -eq 0 ]; then
  info "Backend: venv + dependencies..."
  python3 -m venv "$PROJECT_DIR/backend/venv"
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/backend/venv/bin/activate"
  pip install --quiet --upgrade pip
  pip install --quiet -r "$PROJECT_DIR/backend/requirements.txt"
  success "Python dependencies installed"

  info "Running migrations..."
  (cd "$PROJECT_DIR/backend" && python manage.py migrate --no-input)
  (cd "$PROJECT_DIR/backend" && python manage.py seed_pipeline)
  success "Migrations applied, pipeline stages seeded"

  if [ "$SEED_DEMO" = "yes" ]; then
    (cd "$PROJECT_DIR/backend" && python manage.py seed_demo)
    success "Demo content seeded"
  fi

  if [ -t 0 ]; then
    read -r -p "$(echo -e "${BLUE}Create a Django superuser now? [y/N]: ${NC}")" ANSWER
    case "${ANSWER:-n}" in
      y|Y) (cd "$PROJECT_DIR/backend" && python manage.py createsuperuser) ;;
    esac
  fi
  deactivate

  info "Frontend: npm install (this can take a minute)..."
  (cd "$PROJECT_DIR/frontend" && npm install --no-fund --no-audit --loglevel=error)
  success "Node dependencies installed"
else
  warn "Skipped dependency installation (--skip-install)."
fi

# ------------------------------------------------------------------- git
info "Initializing git repository..."
(
  cd "$PROJECT_DIR"
  echo "$TEMPLATE_COMMIT" > TEMPLATE_VERSION
  cat > SYNC_LOG.md <<EOF
# Sync Log — $PROJECT_NAME

Derived from bp-company @ $TEMPLATE_COMMIT ($(date +%Y-%m-%d)).
See SYNC_GATE.md for the two-repo protocol. Statuses: synced / PENDING / n/a.

| Date | Phase | Commit(s) | Description | Class | Direction | Status |
|------|-------|-----------|-------------|-------|-----------|--------|
| $(date +%Y-%m-%d) | derive | (baseline) | Generated from bp-company @ $TEMPLATE_COMMIT via setup.sh | generic | template→client | synced |
EOF
  git init -q -b main
  git add -A
  git commit -q -m "Initial commit: $PROJECT_NAME derived from bp-company @ $TEMPLATE_COMMIT"
  git remote add template "$TEMPLATE_REMOTE"
  [ -n "$ORIGIN_URL" ] && git remote add origin "$ORIGIN_URL"
)
success "Git repository initialized (remote 'template' -> bp-company$( [ -n "$ORIGIN_URL" ] && echo ", 'origin' -> $ORIGIN_URL" ))"

echo
success "Project '$PROJECT_NAME' created at: $PROJECT_DIR"
echo
echo "Next steps:"
echo "  cd \"$PROJECT_DIR\""
[ "$SKIP_INSTALL" -eq 1 ] && echo "  # install deps: backend venv + pip, frontend npm install"
echo "  ./start.sh                     # backend :8000 + frontend :3000"
echo "  # staff user:  cd backend && source venv/bin/activate && python manage.py createsuperuser"
echo "  # e2e:         npx playwright install chromium   (once), then: cd frontend && npm run e2e"
[ -n "$ORIGIN_URL" ] && echo "  git push -u origin main"
echo
echo "Re-theme in:  frontend/src/theme/tokens.css  ·  locales: frontend/src/i18n/config.ts"
echo "Site config:  Django admin (SiteConfig) or seed your own management command."
