module.exports = {
  apps: [
    {
      name: '12306-help',
      script: 'pnpm',
      args: 'start',
      cwd: '/opt/12306-help',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      out_file: '/var/log/12306-help/out.log',
      error_file: '/var/log/12306-help/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
