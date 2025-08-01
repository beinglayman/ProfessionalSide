module.exports = {
  apps: [{
    name: 'inchronicle-backend',
    script: 'npx tsx src/app.ts',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 1000,
    exp_backoff_restart_delay: 100,
    merge_logs: true,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000,
    health_check_grace_period: 3000
  }]
};