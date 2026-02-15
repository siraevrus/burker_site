# Инструкция по развертыванию на сервере

## Требования к серверу

### Минимальные требования
- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / macOS / Windows Server
- **Node.js**: 18.x или выше (рекомендуется LTS версия)
- **RAM**: минимум 2GB (рекомендуется 4GB+)
- **CPU**: минимум 2 ядра
- **Диск**: минимум 10GB свободного места
- **Порты**: 3000 (или другой для Next.js)

### Рекомендуемые требования
- **RAM**: 4GB+
- **CPU**: 4+ ядра
- **SSD**: для лучшей производительности

## Установка Node.js

### Ubuntu/Debian
```bash
# Установка Node.js через NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version
npm --version
```

### CentOS/RHEL
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### macOS (через Homebrew)
```bash
brew install node@18
```

## Развертывание проекта

### 1. Клонирование репозитория
```bash
cd /var/www
git clone https://github.com/siraevrus/burker_site.git
cd burker_site
```

### 2. Установка зависимостей
```bash
npm install --production
```

### 3. Сборка проекта
```bash
npm run build
```

### 4. Запуск production сервера
```bash
npm start
```

## Настройка PM2 (рекомендуется)

PM2 - процесс-менеджер для Node.js приложений, обеспечивает автозапуск и мониторинг.

### Установка PM2
```bash
npm install -g pm2
```

### Запуск приложения через PM2
```bash
pm2 start npm --name "burkerwatches" -- start
```

### Сохранение конфигурации PM2
```bash
pm2 save
pm2 startup
```

### Полезные команды PM2
```bash
pm2 list              # Список процессов
pm2 logs burkerwatches # Логи приложения
pm2 restart burkerwatches # Перезапуск
pm2 stop burkerwatches   # Остановка
pm2 delete burkerwatches # Удаление
```

## Настройка Nginx (реверс-прокси)

### Установка Nginx
```bash
sudo apt update
sudo apt install nginx
```

### Конфигурация Nginx
Создайте файл `/etc/nginx/sites-available/burkerwatches`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Кеширование статических файлов
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Максимальный размер загружаемых файлов
    client_max_body_size 10M;
}
```

### Активация конфигурации
```bash
sudo ln -s /etc/nginx/sites-available/burkerwatches /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Настройка SSL (Let's Encrypt)

### Установка Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### Получение SSL сертификата
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Автоматическое обновление
Certbot автоматически настроит cron для обновления сертификатов.

## Переменные окружения

Создайте файл `.env.local` в корне проекта (опционально):

```env
# Production URL
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Node environment
NODE_ENV=production
```

## Автоматическое обновление (GitHub Actions или скрипт)

### Скрипт для обновления
Создайте файл `deploy.sh`:

```bash
#!/bin/bash
cd /var/www/burker_site
git pull origin main
npm install --production
npm run build
pm2 restart burkerwatches
```

Сделайте его исполняемым:
```bash
chmod +x deploy.sh
```

## Мониторинг и логи

### Просмотр логов PM2
```bash
pm2 logs burkerwatches
```

### Просмотр логов Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Мониторинг ресурсов
```bash
pm2 monit
```

## Безопасность

### Firewall (UFW для Ubuntu)
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

## Резервное копирование

### Резервное копирование данных
```bash
# Копирование файлов загруженных изображений
tar -czf backup-$(date +%Y%m%d).tar.gz public/promo/
```

## Troubleshooting

### Проверка портов
```bash
sudo netstat -tlnp | grep :3000
```

### Проверка процессов Node.js
```bash
ps aux | grep node
```

### Перезапуск сервисов
```bash
sudo systemctl restart nginx
pm2 restart burkerwatches
```

## Производительность

### Оптимизация Next.js
- Используйте `next/image` для оптимизации изображений
- Включите кеширование в Nginx
- Используйте CDN для статических файлов (опционально)

### Мониторинг производительности
- PM2 monitoring: `pm2 monit`
- Логи Nginx для анализа трафика
- Next.js аналитика (опционально)
