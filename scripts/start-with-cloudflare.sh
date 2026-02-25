#!/bin/bash
set -e

PROJECT_DIR="/Users/mrnugroho/Downloads/pemda-dashboard-react"
cd "$PROJECT_DIR"

echo ""
echo "🚀  Pemda DIY SSO Portal — Starting with Cloudflare Tunnel"
echo "============================================================"

# ── Step 1: Start Docker ────────────────────────────────────────────────────
echo ""
echo "📦  Starting Docker services..."
docker compose up -d

echo "⏳  Waiting for Keycloak..."
until curl -sf http://localhost:8080/realms/master > /dev/null 2>&1; do
  sleep 3; printf "."
done
echo " ready."

# ── Step 2: Kill any existing cloudflared processes ─────────────────────────
pkill cloudflared 2>/dev/null || true
sleep 1

# ── Step 3: Start 3 tunnels, each writing logs to a temp file ───────────────
echo ""
echo "🌐  Starting Cloudflare tunnels..."

FRONTEND_LOG=$(mktemp /tmp/cf_frontend.XXXX)
BACKEND_LOG=$(mktemp /tmp/cf_backend.XXXX)
KEYCLOAK_LOG=$(mktemp /tmp/cf_keycloak.XXXX)

cloudflared tunnel --url http://localhost:3000 --no-autoupdate > "$FRONTEND_LOG" 2>&1 &
cloudflared tunnel --url http://localhost:5000 --no-autoupdate > "$BACKEND_LOG" 2>&1 &
cloudflared tunnel --url http://localhost:8080 --no-autoupdate > "$KEYCLOAK_LOG" 2>&1 &

# ── Step 4: Wait for all 3 URLs to appear in logs ───────────────────────────
echo "⏳  Waiting for tunnel URLs (this takes ~15 seconds)..."

get_tunnel_url() {
  local logfile=$1
  local url=""
  for i in {1..30}; do
    url=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$logfile" 2>/dev/null | head -1)
    [ -n "$url" ] && echo "$url" && return
    sleep 2
  done
  echo ""
}

FRONTEND_URL=$(get_tunnel_url "$FRONTEND_LOG")
BACKEND_URL=$(get_tunnel_url "$BACKEND_LOG")
KEYCLOAK_URL=$(get_tunnel_url "$KEYCLOAK_LOG")

if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ] || [ -z "$KEYCLOAK_URL" ]; then
  echo "❌  Could not get all tunnel URLs. Check logs:"
  echo "    Frontend log : $FRONTEND_LOG"
  echo "    Backend log  : $BACKEND_LOG"
  echo "    Keycloak log : $KEYCLOAK_LOG"
  exit 1
fi

echo "   Frontend  → $FRONTEND_URL"
echo "   Backend   → $BACKEND_URL"
echo "   Keycloak  → $KEYCLOAK_URL"

# ── Step 4: Update frontend/.env ────────────────────────────────────────────
FRONTEND_ENV="$PROJECT_DIR/frontend/.env"

# Update REACT_APP_API_URL to backend Cloudflare URL
if grep -q "REACT_APP_API_URL" "$FRONTEND_ENV"; then
  sed -i '' "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$BACKEND_URL|g" "$FRONTEND_ENV"
else
  echo "REACT_APP_API_URL=$BACKEND_URL" >> "$FRONTEND_ENV"
fi

# Update REACT_APP_KEYCLOAK_URL
if grep -q "REACT_APP_KEYCLOAK_URL" "$FRONTEND_ENV"; then
  sed -i '' "s|REACT_APP_KEYCLOAK_URL=.*|REACT_APP_KEYCLOAK_URL=$KEYCLOAK_URL|g" "$FRONTEND_ENV"
else
  echo "REACT_APP_KEYCLOAK_URL=$KEYCLOAK_URL" >> "$FRONTEND_ENV"
fi

# Ensure host check is disabled for Cloudflare tunnel
grep -q "DANGEROUSLY_DISABLE_HOST_CHECK" "$FRONTEND_ENV" \
  || echo "DANGEROUSLY_DISABLE_HOST_CHECK=true" >> "$FRONTEND_ENV"

echo "✅  frontend/.env updated"

# ── Step 5: Update backend/.env ─────────────────────────────────────────────
BACKEND_ENV="$PROJECT_DIR/backend/.env"

# Update FRONTEND_URL
if grep -q "FRONTEND_URL" "$BACKEND_ENV"; then
  sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|g" "$BACKEND_ENV"
else
  echo "FRONTEND_URL=$FRONTEND_URL" >> "$BACKEND_ENV"
fi

# Update KEYCLOAK_URL — replace whatever host is there with Keycloak Cloudflare URL
if grep -q "KEYCLOAK_URL" "$BACKEND_ENV"; then
  sed -i '' "s|KEYCLOAK_URL=.*|KEYCLOAK_URL=$KEYCLOAK_URL|g" "$BACKEND_ENV"
else
  echo "KEYCLOAK_URL=$KEYCLOAK_URL" >> "$BACKEND_ENV"
fi

echo "✅  backend/.env updated"

# ── Step 6: Update KC_HOSTNAME in docker-compose.yml ────────────────────────
KC_HOST="${KEYCLOAK_URL#https://}"
sed -i '' "s|KC_HOSTNAME:.*|KC_HOSTNAME: $KC_HOST|g" "$PROJECT_DIR/docker-compose.yml"
echo "✅  KC_HOSTNAME updated → $KC_HOST"

# ── Step: Pre-run update-ip.js then override with Cloudflare URLs ────────────
echo ""
echo "🔄  Running update-ip.js then overriding with Cloudflare URLs..."
cd "$PROJECT_DIR" && node update-ip.js > /dev/null 2>&1 || true

# Re-apply Cloudflare URLs after update-ip.js overwrites them
sed -i '' "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$BACKEND_URL|g" "$FRONTEND_ENV"
sed -i '' "s|REACT_APP_KEYCLOAK_URL=.*|REACT_APP_KEYCLOAK_URL=$KEYCLOAK_URL|g" "$FRONTEND_ENV"
sed -i '' "s|KEYCLOAK_URL=.*|KEYCLOAK_URL=$KEYCLOAK_URL|g" "$BACKEND_ENV"
sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|g" "$BACKEND_ENV"
grep -q "DANGEROUSLY_DISABLE_HOST_CHECK" "$FRONTEND_ENV" \
  || echo "DANGEROUSLY_DISABLE_HOST_CHECK=true" >> "$FRONTEND_ENV"

echo "✅  Cloudflare URLs restored after update-ip.js"

# ── Step 8: Update Keycloak client via REST API ──────────────────────────────
echo ""
echo "🔑  Updating Keycloak client redirect URIs..."

ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token', ''))")

CLIENT_UUID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/clients?clientId=pemda-dashboard" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")

if [ -n "$CLIENT_UUID" ]; then
  curl -s -X PUT "http://localhost:8080/admin/realms/PemdaSSO/clients/$CLIENT_UUID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"redirectUris\": [\"$FRONTEND_URL/*\", \"http://localhost:3000/*\"],
      \"webOrigins\": [\"$FRONTEND_URL\", \"http://localhost:3000\"]
    }" > /dev/null
  echo "✅  Keycloak client updated"
else
  echo "⚠️  Could not find client 'pemda-dashboard' in realm 'PemdaSSO'"
fi

# ── Step 9: Restart Keycloak ─────────────────────────────────────────────────
echo ""
echo "🔄  Restarting Keycloak with new hostname..."
docker compose restart keycloak

echo "⏳  Waiting for Keycloak to come back..."
until curl -sf http://localhost:8080/realms/master > /dev/null 2>&1; do
  sleep 3; printf "."
done
echo " ready."

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  ✅  Everything is up and running!"
echo "============================================================"
echo ""
echo "  🌐  Frontend  : $FRONTEND_URL"
echo "  ⚙️   Backend   : $BACKEND_URL"
echo "  🔐  Keycloak  : $KEYCLOAK_URL"
echo "  📧  Mailpit   : http://127.0.0.1:8025"
echo ""
echo "  ⚠️  URLs change on every restart."
echo "     Run this script again after each restart."
echo "  💡  To start servers: cd $PROJECT_DIR && npm run start:cloudflare"
echo "============================================================"
