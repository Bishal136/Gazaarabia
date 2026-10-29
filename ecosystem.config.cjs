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
    {
      name: "github-webhook",
      script: "scripts/webhook-server.cjs",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        WEBHOOK_PORT: 9000,
        GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || "35c11b1027fbf5e5eede89eb993c9c0eaa392978f54f9892",
      },
    },
  ],
};
