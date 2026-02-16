module.exports = {
  apps: [
    {
      name: "burker-watches",
      script: "/root/.nvm/versions/node/v24.13.1/bin/node",
      args: "/var/www/burker-watches.ru/node_modules/.bin/next start",
      cwd: "/var/www/burker-watches.ru",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
        PATH: "/root/.nvm/versions/node/v24.13.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      },
      error_file: "/root/.pm2/logs/burker-watches-error.log",
      out_file: "/root/.pm2/logs/burker-watches-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
