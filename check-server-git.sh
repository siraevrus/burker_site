#!/bin/bash
# Проверка состояния Git на сервере после деплоя
# Запускать НА СЕРВЕРЕ в каталоге проекта: bash check-server-git.sh

set -e

# Каталог проекта (как в deploy.sh)
PROJECT_DIR="${1:-/var/www/burker-watches.ru}"
cd "$PROJECT_DIR" || exit 1

echo "=== Каталог проекта: $(pwd) ==="
echo ""

echo "--- Текущая ветка ---"
git branch -v

echo ""
echo "--- Последний коммит на сервере ---"
git log -1 --oneline

echo ""
echo "--- Сравнение с origin/main (что не подтянуто) ---"
git fetch origin main 2>/dev/null || true
git log HEAD..origin/main --oneline 2>/dev/null || echo "(нет доступа к origin или уже всё подтянуто)"

echo ""
echo "--- Статус (есть ли локальные изменения) ---"
git status -s

echo ""
echo "--- Ожидаемый последний коммит на GitHub ---"
echo "03f9d18 Конвертация цен в рубли с наценкой по категории"
echo ""
echo "Если выше показан другой коммит — выполните: git pull origin main && npm run build && pm2 restart burker-watches"
