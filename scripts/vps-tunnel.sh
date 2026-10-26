#!/usr/bin/env bash
# ==============================================================================
# GAZAARABIA — VPS SECURE SSH TUNNEL CONTROLLER
# ==============================================================================
# Securely tunnels local port 3307 to VPS MySQL (127.0.0.1:3306).
# ==============================================================================

VPS_HOST="${VPS_HOST:-87.106.110.91}"
VPS_PORT="${VPS_PORT:-9592}"
VPS_USER="${VPS_USER:-q9tmx333y8mkbuoz}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_Gazaarabia}"
LOCAL_PORT="${LOCAL_PORT:-3307}"
REMOTE_PORT="${REMOTE_PORT:-3306}"
REMOTE_BIND="${REMOTE_BIND:-127.0.0.1}"
PID_FILE="/tmp/gazaarabia_vps_tunnel.pid"

is_tunnel_running() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      return 0
    fi
  fi
  # Fallback check on port
  if ss -tuln | grep -q ":$LOCAL_PORT "; then
    return 0
  fi
  return 1
}

start_tunnel() {
  if is_tunnel_running; then
    echo "✅ VPS SSH tunnel is already running on port $LOCAL_PORT."
    return 0
  fi

  echo "🚀 Opening secure SSH tunnel to VPS MySQL ($VPS_HOST:$VPS_PORT)..."
  ssh -i "$SSH_KEY" \
      -p "$VPS_PORT" \
      -o IdentitiesOnly=yes \
      -o StrictHostKeyChecking=accept-new \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -f -N -L "$LOCAL_PORT:$REMOTE_BIND:$REMOTE_PORT" \
      "$VPS_USER@$VPS_HOST"

  sleep 1

  # Capture PID
  TUNNEL_PID=$(pgrep -f "ssh.*$LOCAL_PORT:$REMOTE_BIND:$REMOTE_PORT" | head -n 1)
  if [ -n "$TUNNEL_PID" ]; then
    echo "$TUNNEL_PID" > "$PID_FILE"
    echo "✅ SSH Tunnel established successfully! [PID: $TUNNEL_PID]"
    echo "   Local endpoint: 127.0.0.1:$LOCAL_PORT -> VPS MySQL ($REMOTE_PORT)"
  else
    echo "❌ Failed to start SSH tunnel."
    return 1
  fi
}

stop_tunnel() {
  echo "🛑 Stopping VPS SSH tunnel..."
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null && rm -f "$PID_FILE"
  fi
  # Kill any matching process
  pkill -f "ssh.*$LOCAL_PORT:$REMOTE_BIND:$REMOTE_PORT" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "✅ SSH Tunnel stopped."
}

status_tunnel() {
  if is_tunnel_running; then
    PID=$(pgrep -f "ssh.*$LOCAL_PORT:$REMOTE_BIND:$REMOTE_PORT" | head -n 1)
    echo "🟢 VPS SSH tunnel is ACTIVE on 127.0.0.1:$LOCAL_PORT (PID: ${PID:-unknown})"
  else
    echo "⚪ VPS SSH tunnel is INACTIVE."
  fi
}

case "$1" in
  start)
    start_tunnel
    ;;
  stop)
    stop_tunnel
    ;;
  restart)
    stop_tunnel
    sleep 1
    start_tunnel
    ;;
  status)
    status_tunnel
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
