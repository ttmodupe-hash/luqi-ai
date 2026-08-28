module.exports = {
  apps: [{
    name: 'luqi-ai',
    script: './dist/boot.js',
    cwd: '/opt/luqi-ai',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 5,
    kill_timeout: 5000,
    listen_timeout: 10000,
    wait_ready: true,
    watch: false,
    autorestart: true
  }]
};
