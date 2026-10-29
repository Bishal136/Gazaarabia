module.exports = {
  apps: [
    {
      name: "gazaarabia-api",
      script: "server.js",
      instances: 4,
      exec_mode: "cluster",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      listen_timeout: 10000,
      kill_timeout: 5000,
      exp_backoff_restart_delay: 100,
    },
  ],
};
