// PM2 конфиг для PRODUCTION стенда.
// Скопируйте в ecosystem.config.js и заполните реальными значениями.
// ecosystem.config.js добавлен в .gitignore и НЕ коммитится в git.
module.exports = {
  apps: [
    {
      name: "burker-watches",
      script: "/root/.nvm/versions/node/v24.13.1/bin/node",
      args: ".next/standalone/server.js",
      cwd: "/var/www/burker-watches.ru",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
        PATH: "/root/.nvm/versions/node/v24.13.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        DATABASE_URL: "file:/var/lib/burker-watches/dev.db",

        ADMIN_USERNAME: "",
        ADMIN_PASSWORD: "",
        ADMIN_JWT_SECRET: "",
        CRON_SECRET: "",
        ADMIN_EMAIL: "",

        NEXT_PUBLIC_SITE_URL: "https://burker-watches.ru",

        MAILOPOST_API_TOKEN: "",
        MAILOPOST_FROM_EMAIL: "noreply@burker-watches.ru",
        MAILOPOST_FROM_NAME: "Mira Brands | Burker",

        SMTP_HOST: "smtp.msndr.net",
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: "",
        SMTP_PASSWORD: "",

        TELEGRAM_BOT_TOKEN: "",
        TELEGRAM_CHAT_ID: "",

        // T-Bank EACQ (production terminal)
        TBANK_TERMINAL: "",
        TBANK_PASSWORD: "",

        // Orange Data fiscal (production certs in orange_prod/)
        // ORANGEDATA_INN: ""
        // ORANGEDATA_KEY_FILE: "orange_prod/..."
      },
      error_file: "/root/.pm2/logs/burker-watches-error.log",
      out_file: "/root/.pm2/logs/burker-watches-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
