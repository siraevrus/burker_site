// PM2 конфиг для TEST стенда.
// Скопируйте в ecosystem.config.test.js и заполните тестовыми значениями.
// ecosystem.config.test.js добавлен в .gitignore и НЕ коммитится в git.
module.exports = {
  apps: [
    {
      name: "burker-watches-test",
      script: "/root/.nvm/versions/node/v24.13.1/bin/node",
      args: ".next/standalone/server.js",
      cwd: "/var/www/test.burker-watches.ru",
      env: {
        NODE_ENV: "production",
        PORT: 3011,
        PATH: "/root/.nvm/versions/node/v24.13.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        DATABASE_URL: "file:/var/lib/burker-watches-test/dev.db",

        ADMIN_USERNAME: "",
        ADMIN_PASSWORD: "",
        ADMIN_JWT_SECRET: "",
        CRON_SECRET: "",
        ADMIN_EMAIL: "",

        NEXT_PUBLIC_SITE_URL: "https://test.burker-watches.ru",

        MAILOPOST_API_TOKEN: "",
        MAILOPOST_FROM_EMAIL: "noreply@burker-watches.ru",
        MAILOPOST_FROM_NAME: "[TEST] Мира Брендс | Буркер",

        SMTP_HOST: "smtp.msndr.net",
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: "",
        SMTP_PASSWORD: "",

        // Отдельный Telegram-чат для тестовых уведомлений
        TELEGRAM_BOT_TOKEN: "",
        TELEGRAM_CHAT_ID: "",

        // T-Bank EACQ (TEST terminal: https://rest-api-test.tinkoff.ru)
        TBANK_TERMINAL: "",
        TBANK_PASSWORD: "",

        // Orange Data fiscal (test certs in orange_test/)
        // ORANGEDATA_INN: ""
        // ORANGEDATA_KEY_FILE: "orange_test/..."
      },
      error_file: "/root/.pm2/logs/burker-watches-test-error.log",
      out_file: "/root/.pm2/logs/burker-watches-test-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
