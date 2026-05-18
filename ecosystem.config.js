const path = require('path')

module.exports = {
  apps: [
    {
      name: '12306-help',
      script: 'pnpm',
      args: 'start -- -p 3005',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      out_file: path.join(__dirname, 'log', 'out.log'),
      error_file: path.join(__dirname, 'log', 'error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
