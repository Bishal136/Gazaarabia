#!/bin/bash
set -e

APP_DIR="/var/www/Gazaarabia"
LOG_FILE="/var/www/Gazaarabia/deploy-webhook.log"
exec >> "$LOG_FILE" 2>&1

echo "========================================="
echo "Deployment started: $(date)"
echo "========================================="

cd "$APP_DIR"

echo "[1/4] Syncing latest code from origin/main..."
git fetch origin main
git reset --hard origin/main

echo "[2/4] Ensuring dependencies are up-to-date and database indexes exist..."
npm install --prefer-offline --no-audit
npx tsx scripts/ensure-indexes.ts || true

echo "[3/4] Building production Next.js application..."
npm run build

echo "[4/5] Gracefully reloading PM2 cluster..."
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "[5/5] Checking and applying Nginx performance tuning if permitted..."
if [ -f "$APP_DIR/deploy/install-nginx-tuning.sh" ]; then
  if [ "$EUID" -eq 0 ]; then
    echo "Deploy script running as root. Applying Nginx tuning directly..."
    bash "$APP_DIR/deploy/install-nginx-tuning.sh" || true
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    echo "Deploy script has passwordless sudo. Applying Nginx tuning..."
    sudo -n bash "$APP_DIR/deploy/install-nginx-tuning.sh" || true
  else
    echo "Note: Non-root deploy runner without passwordless sudo. Run 'sudo $APP_DIR/deploy/install-nginx-tuning.sh' manually."
  fi
fi

echo "========================================="
echo "Deployment successful: $(date)"
echo "========================================="
