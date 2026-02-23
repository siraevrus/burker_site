#!/usr/bin/env bash

# Безопасный production-deploy:
# - без git reset --hard
# - с prisma migrate deploy (вместо db push)
# - с проверкой health endpoint

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/burker-watches.ru}"
APP_NAME="${APP_NAME:-burker-watches}"
PORT="${PORT:-3010}"
DB_PATH="${DB_PATH:-/var/lib/burker-watches/dev.db}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
RETRIES="${RETRIES:-10}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERR]${NC} $1"; }

on_error() {
  log_err "Деплой прерван из-за ошибки на шаге: ${BASH_COMMAND}"
  log_info "Последние логи PM2:"
  pm2 logs "${APP_NAME}" --lines 40 || true
}
trap on_error ERR

echo ""
echo "=============================================================="
echo " DEPLOY ${APP_NAME}  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================================="

cd "${PROJECT_DIR}"
log_info "Рабочая директория: ${PROJECT_DIR}"

log_info "Проверка git-статуса..."
if [[ -n "$(git status --porcelain)" ]]; then
  log_warn "Есть локальные изменения. Прерываю деплой, чтобы не потерять правки."
  git status --short
  exit 1
fi

log_info "Обновление кода..."
git fetch origin main
git pull --ff-only origin main
log_ok "Код обновлён"

log_info "Установка зависимостей..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
log_ok "Зависимости установлены"

log_info "Подготовка директории БД..."
mkdir -p "$(dirname "${DB_PATH}")"
if [[ ! -f "${DB_PATH}" && -f "${PROJECT_DIR}/prisma/dev.db" ]]; then
  cp "${PROJECT_DIR}/prisma/dev.db" "${DB_PATH}"
  log_ok "Скопирована существующая БД в ${DB_PATH}"
fi
chmod 755 "$(dirname "${DB_PATH}")" || true
chmod 664 "${DB_PATH}" 2>/dev/null || true
export DATABASE_URL="file:${DB_PATH}"
log_ok "DATABASE_URL=${DATABASE_URL}"

log_info "Prisma generate + migrate deploy..."
npx prisma generate
npx prisma migrate deploy
log_ok "Миграции применены"

log_info "Сборка приложения..."
npm run build
log_ok "Сборка завершена"

log_info "Перезапуск PM2..."
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}"
else
  pm2 start ecosystem.config.js --only "${APP_NAME}"
fi
pm2 save
log_ok "PM2 перезапущен"

log_info "Health-check ${HEALTH_PATH}..."
success=0
for ((i=1; i<=RETRIES; i++)); do
  code="$(curl -sS -o /tmp/burker-health.json -w "%{http_code}" "http://127.0.0.1:${PORT}${HEALTH_PATH}" || true)"
  if [[ "${code}" == "200" ]]; then
    success=1
    break
  fi
  sleep 2
done

if [[ "${success}" -ne 1 ]]; then
  log_err "Health-check не прошёл"
  cat /tmp/burker-health.json 2>/dev/null || true
  exit 1
fi

log_ok "Health-check OK"
cat /tmp/burker-health.json || true

echo ""
echo "=============================================================="
echo -e "${GREEN} DEPLOY УСПЕШЕН${NC}"
echo " app: ${APP_NAME}"
echo " db : ${DB_PATH}"
echo " url: http://127.0.0.1:${PORT}${HEALTH_PATH}"
echo "=============================================================="
