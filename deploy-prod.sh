#!/usr/bin/env bash

# Безопасный production-deploy:
# - без git reset --hard
# - с авто-режимом Prisma:
#   * migrate deploy, если миграции есть
#   * db push, если миграций нет
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
DIRTY=$(git status --porcelain)
if [[ -n "$DIRTY" ]]; then
  # Не блокируем деплой из-за изменений в загружаемом контенте, локальных бэкапах и ecosystem.config.js
  REMAINING=""
  while IFS= read -r line; do
    path="${line:3}"
    case "$path" in
      public/promo/*|public/products/*|public/order-proofs/*|public/yandex_*.html|ecosystem.config.js|backups|backups/|backups/*|orange_prod/*) ;;
      *) REMAINING="${REMAINING}${line}\n" ;;
    esac
  done <<< "$DIRTY"
  if [[ -n "$REMAINING" ]]; then
    log_warn "Есть локальные изменения (не только загрузки/ecosystem). Прерываю деплой."
    echo -e "$REMAINING"
    exit 1
  fi
  log_info "Изменения только в разрешённых локальных файлах (uploads/yandex/ecosystem/orange_prod) — продолжаю деплой."
fi

# Сохраняем proof-изображения ДО git stash (stash --include-untracked может их забрать,
# а stash pop при конфликте — потерять)
PROMO_PROOFS_BACKUP=""
if ls public/promo/proof-* >/dev/null 2>&1; then
  PROMO_PROOFS_BACKUP=$(mktemp -d)
  cp public/promo/proof-* "${PROMO_PROOFS_BACKUP}/"
  log_info "Сохранены proof-изображения из public/promo/ (до git stash)"
fi
if ls .next/standalone/public/promo/proof-* >/dev/null 2>&1; then
  if [[ -z "${PROMO_PROOFS_BACKUP}" ]]; then
    PROMO_PROOFS_BACKUP=$(mktemp -d)
  fi
  cp -n .next/standalone/public/promo/proof-* "${PROMO_PROOFS_BACKUP}/" 2>/dev/null || true
  log_info "Сохранены proof-изображения из standalone/public/promo/ (до git stash)"
fi

log_info "Обновление кода..."
git fetch origin main
STASHED=0
if [[ -n "$(git status --porcelain)" ]]; then
  git stash --include-untracked -q && STASHED=1
  log_info "Локальные изменения сохранены в stash"
fi
git pull --ff-only origin main
if [[ "$STASHED" -eq 1 ]]; then
  git stash pop -q 2>/dev/null || {
    log_warn "git stash pop вызвал конфликт — локальные файлы восстановлены, конфликт можно игнорировать"
    git checkout --theirs . 2>/dev/null || true
    git reset HEAD . 2>/dev/null || true
  }
fi
log_ok "Код обновлён"

# Удаление дубликатов "(2)" (могут ломать сборку Next.js)
find "${PROJECT_DIR}" -name "* (2)*" -type f -delete 2>/dev/null || true

log_info "Установка зависимостей..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
log_ok "Зависимости установлены"

log_info "Подготовка директории БД..."
mkdir -p "$(dirname "${DB_PATH}")"
# Одноразовый bootstrap: если runtime-БД ещё нет, берём начальный снимок из repo-local prisma/dev.db.
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

# Режим Prisma:
# 1) Если есть миграции (prisma/migrations/*/migration.sql) -> migrate deploy
# 2) Если миграций нет -> db push (для проектов без истории миграций)
# 3) Можно форсировать db push: FORCE_DB_PUSH=1 ./deploy-prod.sh
if [[ "${FORCE_DB_PUSH:-0}" == "1" ]]; then
  log_warn "FORCE_DB_PUSH=1 -> принудительно запускаю prisma db push"
  npx prisma db push --skip-generate
  log_ok "Схема БД синхронизирована через db push"
elif ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
  log_info "Найдены миграции -> prisma migrate deploy"
  npx prisma migrate deploy
  log_ok "Миграции применены"
else
  log_warn "Миграции не найдены -> prisma db push --skip-generate"
  npx prisma db push --skip-generate
  log_ok "Схема БД синхронизирована через db push"
fi

# Сохраняем загруженные файлы ДО сборки (rm -rf .next/standalone/public удалит всё)
UPLOADS_BACKUP=""
if [[ -d ".next/standalone/public/order-proofs" ]]; then
  UPLOADS_BACKUP=$(mktemp -d)
  cp -r ".next/standalone/public/order-proofs" "${UPLOADS_BACKUP}/order-proofs"
  log_info "Сохранена копия standalone/public/order-proofs (до сборки)"
fi

log_info "Сборка приложения..."
npm run build
log_ok "Сборка завершена"

log_info "Подготовка standalone-статики (CSS/JS/public)..."
if [[ ! -d ".next/standalone" ]]; then
  log_err "Не найдена директория .next/standalone. Проверьте output: 'standalone' в next.config.ts"
  exit 1
fi

mkdir -p .next/standalone/.next

if [[ ! -d ".next/static" ]]; then
  log_err "Не найдена директория .next/static после build"
  exit 1
fi
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

if [[ -d "public" ]]; then
  rm -rf .next/standalone/public
  cp -r public .next/standalone/public
else
  log_warn "Папка public не найдена в проекте, пропускаю копирование"
fi

# Восстанавливаем order-proofs, сохранённые до сборки
if [[ -n "${UPLOADS_BACKUP}" && -d "${UPLOADS_BACKUP}/order-proofs" ]]; then
  mkdir -p ".next/standalone/public/order-proofs"
  cp -r "${UPLOADS_BACKUP}/order-proofs/." ".next/standalone/public/order-proofs/" 2>/dev/null || true
  rm -rf "${UPLOADS_BACKUP}"
  log_ok "Восстановлен standalone/public/order-proofs"
fi

# Восстанавливаем proof-изображения в promo/
if [[ -n "${PROMO_PROOFS_BACKUP}" ]] && ls "${PROMO_PROOFS_BACKUP}"/proof-* >/dev/null 2>&1; then
  mkdir -p ".next/standalone/public/promo"
  cp -n "${PROMO_PROOFS_BACKUP}"/proof-* ".next/standalone/public/promo/" 2>/dev/null || true
  mkdir -p "public/promo"
  cp -n "${PROMO_PROOFS_BACKUP}"/proof-* "public/promo/" 2>/dev/null || true
  rm -rf "${PROMO_PROOFS_BACKUP}"
  log_ok "Восстановлены proof-изображения в promo/"
fi

if [[ ! -d ".next/standalone/.next/static" ]]; then
  log_err "Копирование static не удалось"
  exit 1
fi
if [[ -d "public" && ! -d ".next/standalone/public" ]]; then
  log_err "Копирование public не удалось"
  exit 1
fi
log_ok "Standalone-статика подготовлена"

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
