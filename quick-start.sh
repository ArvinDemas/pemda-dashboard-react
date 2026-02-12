#!/bin/bash

# ===================================================================
# PEMDA Dashboard - Quick Start Script
# ===================================================================
# One command to update IP + restart everything
# Usage: ./quick-start.sh
# ===================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_ENV="$PROJECT_DIR/backend/.env"
FRONTEND_ENV="$PROJECT_DIR/frontend/.env"
CONTAINER_NAME="keycloak_arvin"
REALM="Jogja-SSO"
CLIENT_ID="pemda-dashboard"

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         PEMDA Dashboard - Quick Start                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ===================================================================
# STEP 1: Detect current LAN IP
# ===================================================================
echo -e "${CYAN}🔍 Detecting LAN IP address...${NC}"

# Get current LAN IP (macOS)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$CURRENT_IP" ]; then
    echo -e "${RED}❌ Could not detect LAN IP address${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Current IP: ${BOLD}${CURRENT_IP}${NC}\n"

# ===================================================================
# STEP 2: Get old IP from backend .env
# ===================================================================
OLD_IP=""
if [ -f "$BACKEND_ENV" ]; then
    OLD_IP=$(grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' "$BACKEND_ENV" | head -1)
fi

if [ -z "$OLD_IP" ]; then
    OLD_IP="10.0.0.1"  # fallback
fi

if [ "$OLD_IP" == "$CURRENT_IP" ]; then
    echo -e "${GREEN}✅ IP is already up to date (${CURRENT_IP})${NC}\n"
    echo -e "${CYAN}🔄 Skipping IP update, starting servers...${NC}\n"
else
    echo -e "${YELLOW}🔄 Updating IP: ${OLD_IP} → ${CURRENT_IP}${NC}\n"

    # ===================================================================
    # STEP 3: Update .env files
    # ===================================================================
    echo -e "${BOLD}${BLUE}━━━ Updating .env files ━━━${NC}\n"

    # Update backend/.env - replace any 10.x.x.x or 192.168.x.x IP
    if [ -f "$BACKEND_ENV" ]; then
        sed -i '' -E "s/([0-9]{1,3}\.){3}[0-9]{1,3}(:8080)/${CURRENT_IP}\2/g" "$BACKEND_ENV"
        sed -i '' -E "s/([0-9]{1,3}\.){3}[0-9]{1,3}(:3000)/${CURRENT_IP}\2/g" "$BACKEND_ENV"
        sed -i '' -E "s/([0-9]{1,3}\.){3}[0-9]{1,3}(:5000)/${CURRENT_IP}\2/g" "$BACKEND_ENV"
        echo -e "${GREEN}✅ Updated: backend/.env${NC}"
    else
        echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
    fi

    # Update frontend/.env
    if [ -f "$FRONTEND_ENV" ]; then
        sed -i '' -E "s/([0-9]{1,3}\.){3}[0-9]{1,3}(:5000)/${CURRENT_IP}\2/g" "$FRONTEND_ENV"
        sed -i '' -E "s/([0-9]{1,3}\.){3}[0-9]{1,3}(:3000)/${CURRENT_IP}\2/g" "$FRONTEND_ENV"
        echo -e "${GREEN}✅ Updated: frontend/.env${NC}"
    else
        echo -e "${YELLOW}⚠️  frontend/.env not found${NC}"
    fi

    echo ""

    # ===================================================================
    # STEP 4: Update Keycloak client redirect URIs via Admin API
    # ===================================================================
    echo -e "${BOLD}${BLUE}━━━ Updating Keycloak Client Config ━━━${NC}\n"

    # Check if Keycloak container is running
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${CYAN}📡 Keycloak container is running${NC}"

        KEYCLOAK_URL="http://localhost:8080"

        # Wait for Keycloak to be ready
        echo -e "${CYAN}⏳ Checking Keycloak readiness...${NC}"
        KC_READY=false
        for i in $(seq 1 10); do
            if curl -sf "$KEYCLOAK_URL/realms/$REALM" > /dev/null 2>&1; then
                KC_READY=true
                break
            fi
            sleep 2
        done

        if [ "$KC_READY" = true ]; then
            echo -e "${GREEN}✅ Keycloak is ready${NC}"

            # Get admin token
            echo -e "${CYAN}🔐 Getting admin token...${NC}"

            # Read client secret from backend .env
            KC_SECRET=$(grep "KEYCLOAK_CLIENT_SECRET" "$BACKEND_ENV" | cut -d'=' -f2 | tr -d ' ')

            ADMIN_TOKEN=$(curl -sf -X POST \
                "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
                -d "grant_type=client_credentials" \
                -d "client_id=$CLIENT_ID" \
                -d "client_secret=$KC_SECRET" \
                2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")

            if [ -n "$ADMIN_TOKEN" ]; then
                echo -e "${GREEN}✅ Got admin token${NC}"

                # Get client internal ID
                CLIENT_UUID=$(curl -sf \
                    "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID" \
                    -H "Authorization: Bearer $ADMIN_TOKEN" \
                    2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')" 2>/dev/null || echo "")

                if [ -n "$CLIENT_UUID" ]; then
                    echo -e "${CYAN}📋 Client UUID: ${CLIENT_UUID}${NC}"

                    # Update client redirect URIs
                    echo -e "${CYAN}🔄 Updating client redirect URIs...${NC}"

                    UPDATE_RESULT=$(curl -sf -o /dev/null -w "%{http_code}" -X PUT \
                        "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID" \
                        -H "Authorization: Bearer $ADMIN_TOKEN" \
                        -H "Content-Type: application/json" \
                        -d "{
                            \"clientId\": \"$CLIENT_ID\",
                            \"rootUrl\": \"http://${CURRENT_IP}:3000\",
                            \"redirectUris\": [\"http://${CURRENT_IP}:3000/*\"],
                            \"webOrigins\": [\"http://${CURRENT_IP}:3000\"],
                            \"attributes\": {
                                \"post.logout.redirect.uris\": \"http://${CURRENT_IP}:3000/*\"
                            }
                        }" 2>/dev/null || echo "000")

                    if [ "$UPDATE_RESULT" = "204" ] || [ "$UPDATE_RESULT" = "200" ]; then
                        echo -e "${GREEN}✅ Keycloak client redirect URIs updated!${NC}"
                    else
                        echo -e "${YELLOW}⚠️  Could not update redirect URIs (HTTP $UPDATE_RESULT)${NC}"
                        echo -e "${YELLOW}   You may need to update manually in Keycloak Admin Console${NC}"
                    fi
                else
                    echo -e "${YELLOW}⚠️  Could not find client UUID. Manual update needed.${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  Could not get admin token. Manual Keycloak update needed.${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Keycloak not ready. Skipping client update.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Keycloak container '${CONTAINER_NAME}' not running${NC}"
        echo -e "${YELLOW}   Start it with: docker start ${CONTAINER_NAME}${NC}"
    fi

    echo ""
fi

# ===================================================================
# STEP 5: Kill existing servers and restart
# ===================================================================
echo -e "${BOLD}${BLUE}━━━ Restarting Servers ━━━${NC}\n"

# Kill existing node processes on ports 3000 and 5000
echo -e "${CYAN}🛑 Stopping existing servers...${NC}"
lsof -ti:5000 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo -e "${GREEN}✅ Existing servers stopped${NC}"

# Start backend
echo -e "${CYAN}🚀 Starting backend server (port 5000)...${NC}"
cd "$PROJECT_DIR/backend"
nohup npm start > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

# Start frontend
echo -e "${CYAN}🚀 Starting frontend server (port 3000)...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none nohup npm start > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for servers to be ready
echo -e "\n${YELLOW}⏳ Waiting for servers to initialize (15s)...${NC}"
sleep 15

# ===================================================================
# DONE!
# ===================================================================
echo -e "\n${BOLD}${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ ALL READY!                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "  ${BOLD}📍 IP Address:${NC}  ${CURRENT_IP}"
echo -e "  ${BOLD}🌐 Dashboard:${NC}   ${BLUE}http://${CURRENT_IP}:3000${NC}"
echo -e "  ${BOLD}📡 Backend:${NC}     ${BLUE}http://${CURRENT_IP}:5000${NC}"
echo -e "  ${BOLD}🔐 Keycloak:${NC}    ${BLUE}http://${CURRENT_IP}:8080/admin${NC}"
echo ""
echo -e "  ${CYAN}📋 Logs:${NC}"
echo -e "     Backend:  tail -f $PROJECT_DIR/backend.log"
echo -e "     Frontend: tail -f $PROJECT_DIR/frontend.log"
echo ""
