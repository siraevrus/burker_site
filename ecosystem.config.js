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
        DATABASE_URL: "file:/var/www/burker-watches.ru/prisma/dev.db",
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
