#!/usr/bin/env bash
set -e

# ==============================================================================
# Script: install-nginx-tuning.sh
# Purpose: Installs optimized Nginx configuration & Cloudflare real_ip mappings
# Target: Production VPS (/etc/nginx/)
# ==============================================================================

echo "========================================================"
echo " Gazaarabia Nginx & Cloudflare Latency Optimization Setup"
echo "========================================================"

if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root (or with sudo)."
  exit 1
fi

APP_DIR="/var/www/Gazaarabia"
CONF_SRC="$APP_DIR/deploy/nginx-gazaarabia.conf"
CLOUDFLARE_SRC="$APP_DIR/deploy/cloudflare-ips.conf"

if [ ! -f "$CONF_SRC" ]; then
  echo "[-] Error: $CONF_SRC not found. Make sure repo is up to date."
  exit 1
fi

# 1. Install Cloudflare IP configuration
echo "[1/4] Installing Cloudflare real_ip configuration..."
mkdir -p /etc/nginx/conf.d
cp "$CLOUDFLARE_SRC" /etc/nginx/conf.d/cloudflare-ips.conf
echo "    -> /etc/nginx/conf.d/cloudflare-ips.conf installed."

# 2. Backup existing Nginx site config
echo "[2/4] Backing up current Nginx site config..."
if [ -f "/etc/nginx/sites-available/gazaarabia" ]; then
  cp /etc/nginx/sites-available/gazaarabia /etc/nginx/sites-available/gazaarabia.bak.$(date +%s)
  echo "    -> Backup saved to /etc/nginx/sites-available/gazaarabia.bak.*"
fi

# 3. Copy new optimized configuration
echo "[3/4] Deploying optimized Nginx configuration..."
cp "$CONF_SRC" /etc/nginx/sites-available/gazaarabia
ln -sf /etc/nginx/sites-available/gazaarabia /etc/nginx/sites-enabled/gazaarabia

# 4. Test configuration syntax before reloading
echo "[4/4] Validating Nginx configuration syntax..."
if nginx -t; then
  echo "[+] Nginx configuration syntax is valid! Reloading Nginx with zero downtime..."
  systemctl reload nginx
  echo "[✓] Nginx reloaded successfully with HTTP/2, TLS 1.3 session cache, keepalives, and static disk offloading."
else
  echo "[-] Nginx configuration test FAILED! Rolling back..."
  if ls /etc/nginx/sites-available/gazaarabia.bak.* 1> /dev/null 2>&1; then
    LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/gazaarabia.bak.* | head -n1)
    cp "$LATEST_BACKUP" /etc/nginx/sites-available/gazaarabia
    systemctl reload nginx
    echo "[!] Rolled back to $LATEST_BACKUP"
  fi
  exit 1
fi

echo "========================================================"
echo " Optimization complete! Next steps:"
echo " 1. Ensure Cloudflare SSL mode is set to 'Full (Strict)'"
echo " 2. Enable Cloudflare Edge Caching rules for static assets"
echo "========================================================"
