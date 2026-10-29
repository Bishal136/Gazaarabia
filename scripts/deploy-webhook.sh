#!/bin/bash
set -e

APP_DIR="/var/www/Gazaarabia"
LOG_FILE="/var/www/webhook-deploy/deploy.log"

mkdir -p /var/www/webhook-deploy
exec >> "$LOG_FILE" 2>&1

echo "========================================="
echo "Deployment started: $(date)"
echo "========================================="

cd "$APP_DIR"

echo "[1/4] Syncing latest code from origin/main..."
git fetch origin main
git reset --hard origin/main

echo "[2/4] Ensuring dependencies are up-to-date..."
npm install --prefer-offline --no-audit

echo "[3/4] Building production Next.js application..."
npm run build

echo "[4/4] Gracefully reloading PM2 cluster..."
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "========================================="
echo "Deployment successful: $(date)"
echo "========================================="
