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
#                     [--seed-demo] [--skip-install] [--no-db] \
#                     [--force]           # allow generating into an existing directory
#                     [--recreate-db]     # drop + recreate the database if it exists
#                     [--delete-template] # delete this template folder after setup
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
FORCE_DIR=0; RECREATE_DB=0; OVERWRITING=0; DELETE_TEMPLATE="ask"

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
    --force) FORCE_DIR=1; shift ;;
    --recreate-db) RECREATE_DB=1; shift ;;
    --delete-template) DELETE_TEMPLATE="yes"; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done

# ----------------------------------------------------------------- prompts
# Interactive prompts only on a TTY; otherwise use defaults or fail loudly.
INTERACTIVE=0; [ -t 0 ] && INTERACTIVE=1

if [ -z "$PROJECT_NAME" ]; then
  [ "$INTERACTIVE" -eq 1 ] || fail "Missing --name (required in non-interactive mode)."
  read -r -p "$(echo -e "${BLUE}Project name (python identifier, e.g. acmeco): ${NC}")" PROJECT_NAME
fi
[[ "$PROJECT_NAME" =~ ^[a-z_][a-z0-9_]*$ ]] || fail "Project name must be a lowercase python identifier (a-z, 0-9, _)."
[ "$PROJECT_NAME" = "bp_company" ] && fail "Pick a name different from bp_company."

KEBAB_NAME="${PROJECT_NAME//_/-}"

if [ -z "$DISPLAY_NAME" ]; then
  if [ "$INTERACTIVE" -eq 1 ]; then
    read -r -p "$(echo -e "${BLUE}Display name [${PROJECT_NAME}]: ${NC}")" DISPLAY_NAME
  fi
  DISPLAY_NAME="${DISPLAY_NAME:-$PROJECT_NAME}"
fi

DEFAULT_DIR="$(dirname "$TEMPLATE_DIR")/$KEBAB_NAME"
if [ -z "$PROJECT_DIR" ]; then
  if [ "$INTERACTIVE" -eq 1 ]; then
    read -r -p "$(echo -e "${BLUE}Project directory [${DEFAULT_DIR}]: ${NC}")" PROJECT_DIR
  fi
  PROJECT_DIR="${PROJECT_DIR:-$DEFAULT_DIR}"
fi

# --- existing-directory handling (mirrors the old SaaS template script) ---
if [ -e "$PROJECT_DIR" ]; then
  [ -d "$PROJECT_DIR" ] || fail "Target exists and is not a directory: $PROJECT_DIR"
  if [ "$FORCE_DIR" -eq 1 ]; then
    OVERWRITING=1
  elif [ -t 0 ]; then
    warn "Directory already exists: $PROJECT_DIR"
    read -r -p "$(echo -e "${YELLOW}Continue and overwrite the generated files in it? Your own files (Design/, docs, .env backups, …) are kept; backend/ and frontend/ are replaced. [y/N]: ${NC}")" ANSWER
    case "${ANSWER:-n}" in
      y|Y) OVERWRITING=1 ;;
      *) fail "Setup cancelled — target directory exists." ;;
    esac
  else
    fail "Target already exists: $PROJECT_DIR  (pass --force to overwrite its generated files)"
  fi
fi

# Safety guards before any overwrite can happen
mkdir -p "$PROJECT_DIR"
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
[ "$PROJECT_DIR" = "/" ] && fail "Refusing to use / as the project directory."
[ "$PROJECT_DIR" = "$HOME" ] && fail "Refusing to use your home directory as the project directory."
[ "$PROJECT_DIR" = "$TEMPLATE_DIR" ] && fail "Project directory must not be the template itself."
case "$PROJECT_DIR/" in
  "$TEMPLATE_DIR/"*) fail "Project directory must not be inside the template." ;;
esac
case "$TEMPLATE_DIR/" in
  "$PROJECT_DIR/"*) fail "Project directory must not contain the template (you selected a parent folder of bp-company)." ;;
esac

if [ "$OVERWRITING" -eq 1 ]; then
  # Remove prior generated app folders so stale files cannot survive.
  rm -rf "$PROJECT_DIR/backend" "$PROJECT_DIR/frontend"
  info "Existing directory: replacing generated files, keeping everything else."
fi

if [ -z "$DB_NAME" ]; then
  if [ "$INTERACTIVE" -eq 1 ]; then
    read -r -p "$(echo -e "${BLUE}Database name [${PROJECT_NAME}_db]: ${NC}")" DB_NAME
  fi
  DB_NAME="${DB_NAME:-${PROJECT_NAME}_db}"
fi
if [ -z "$DB_USER" ]; then
  if [ "$INTERACTIVE" -eq 1 ]; then
    read -r -p "$(echo -e "${BLUE}Database user [$(whoami)]: ${NC}")" DB_USER
  fi
  DB_USER="${DB_USER:-$(whoami)}"
fi
if [ -z "$DB_PASSWORD" ] && [ "$INTERACTIVE" -eq 1 ]; then
  read -r -s -p "$(echo -e "${BLUE}Database password (empty for local trust auth): ${NC}")" DB_PASSWORD || true
  echo
fi
if [ "$SEED_DEMO" = "ask" ]; then
  if [ "$INTERACTIVE" -eq 1 ]; then
    read -r -p "$(echo -e "${BLUE}Seed the Acme demo content? [y/N]: ${NC}")" ANSWER
    case "${ANSWER:-n}" in y|Y) SEED_DEMO="yes" ;; *) SEED_DEMO="no" ;; esac
  else
    SEED_DEMO="no"
  fi
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
  --exclude 'SYNC_LOG.md' \
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
  if ! command -v psql >/dev/null 2>&1; then
    warn "psql not found — create the database manually before migrating."
  else
    # Can we even talk to the server?
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '' >/dev/null 2>&1; then
      warn "Cannot connect to PostgreSQL as $DB_USER@$DB_HOST:$DB_PORT (is it running? auth ok?)."
      warn "Create the database manually: createdb $DB_NAME  (or use ./setup_database.sh)"
    else
      DB_EXISTS="no"
      if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -Atc \
           "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
        DB_EXISTS="yes"
      fi

      if [ "$DB_EXISTS" = "yes" ]; then
        DROP_IT=0
        if [ "$RECREATE_DB" -eq 1 ]; then
          DROP_IT=1
        elif [ -t 0 ]; then
          warn "Database $DB_NAME already exists."
          read -r -p "$(echo -e "${YELLOW}Drop and recreate it? All its data will be lost. [y/N]: ${NC}")" ANSWER
          case "${ANSWER:-n}" in y|Y) DROP_IT=1 ;; esac
        else
          warn "Database $DB_NAME already exists — using it as-is (pass --recreate-db to drop + recreate)."
          warn "Beware: a database from another project may contain stale tables."
        fi
        if [ "$DROP_IT" -eq 1 ]; then
          PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" \
            || fail "Could not drop $DB_NAME (close open connections and retry)."
          success "Database dropped"
          DB_EXISTS="no"
        fi
      fi

      if [ "$DB_EXISTS" = "no" ]; then
        info "Creating database $DB_NAME..."
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" \
          || fail "Could not create $DB_NAME."
        success "Database created"
      else
        info "Using existing database $DB_NAME."
      fi
    fi
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
(
  cd "$PROJECT_DIR"
  echo "$TEMPLATE_COMMIT" > TEMPLATE_VERSION
  if [ ! -f SYNC_LOG.md ]; then
    cat > SYNC_LOG.md <<EOF
# Sync Log — $PROJECT_NAME

Derived from bp-company @ $TEMPLATE_COMMIT ($(date +%Y-%m-%d)).
See SYNC_GATE.md for the two-repo protocol. Statuses: synced / PENDING / n/a.

| Date | Phase | Commit(s) | Description | Class | Direction | Status |
|------|-------|-----------|-------------|-------|-----------|--------|
| $(date +%Y-%m-%d) | derive | (baseline) | Generated from bp-company @ $TEMPLATE_COMMIT via setup.sh | generic | template→client | synced |
EOF
  fi

  if [ -d .git ]; then
    warn "Existing git repository detected — history, remotes and SYNC_LOG.md kept."
    warn "Review and commit the regeneration yourself: git status && git add -A && git commit"
  else
    info "Initializing git repository..."
    git init -q -b main
    git add -A
    git commit -q -m "Initial commit: $PROJECT_NAME derived from bp-company @ $TEMPLATE_COMMIT"
    git remote add template "$TEMPLATE_REMOTE"
    [ -n "$ORIGIN_URL" ] && git remote add origin "$ORIGIN_URL"
    echo -e "${GREEN}[ ok ]${NC} Git repository initialized (remote 'template' -> bp-company$( [ -n "$ORIGIN_URL" ] && echo ", 'origin' -> $ORIGIN_URL" ))"
  fi
)

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

# ------------------------------------------- optional template self-cleanup
# (Same flow as the original SaaS template: offer to remove the template copy
# once installation is complete.)
template_has_unsaved_work() {
  [ -d "$TEMPLATE_DIR/.git" ] || return 1
  if [ -n "$(git -C "$TEMPLATE_DIR" status --porcelain 2>/dev/null)" ]; then
    return 0
  fi
  if [ -n "$(git -C "$TEMPLATE_DIR" log --oneline '@{u}..HEAD' 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

if [ "$DELETE_TEMPLATE" = "ask" ] && [ "$INTERACTIVE" -eq 1 ]; then
  echo
  read -r -p "$(echo -e "${YELLOW}Installation is complete. Do you want to delete the template folder at ${TEMPLATE_DIR}? [y/N]: ${NC}")" ANSWER
  case "${ANSWER:-n}" in y|Y) DELETE_TEMPLATE="yes" ;; *) DELETE_TEMPLATE="no" ;; esac
fi

if [ "$DELETE_TEMPLATE" = "yes" ]; then
  if template_has_unsaved_work; then
    warn "NOT deleting the template: it has uncommitted changes or unpushed commits."
    warn "Commit/push them first, or delete it manually: rm -rf \"$TEMPLATE_DIR\""
  else
    success "Deleting template folder: $TEMPLATE_DIR"
    cd "$(dirname "$TEMPLATE_DIR")"
    exec /bin/rm -rf "$TEMPLATE_DIR"
  fi
else
  info "Kept template folder at: $TEMPLATE_DIR"
fi
