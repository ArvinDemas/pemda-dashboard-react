#!/bin/bash

# ===================================================================
# PEMDA Dashboard - Keycloak Docker Migration Script (v2)
# ===================================================================
# Strategy: Backup database volume, recreate container with new IP
# This preserves ALL data without export/import complexity
# ===================================================================

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="keycloak_arvin"
IMAGE_NAME="pemdasso-final"
THEME_PATH="/Users/mrnugroho/jogja-theme"
BACKUP_DIR="$(pwd)/keycloak-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATA_BACKUP="$BACKUP_DIR/keycloak-data-${TIMESTAMP}"

# Get current LAN IP
get_current_ip() {
    ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}'
}

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║    PEMDA Dashboard - Keycloak Migration Tool v2           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Detect current IP
CURRENT_IP=$(get_current_ip)
echo -e "${CYAN}📡 Detected current IP: ${BOLD}${CURRENT_IP}${NC}\n"

# Get old IP from container
OLD_IP=$(docker inspect $CONTAINER_NAME --format='{{range .Config.Env}}{{println .}}{{end}}' | grep "KC_HOSTNAME=" | cut -d'=' -f2)
echo -e "${YELLOW}📋 Old IP in Keycloak: ${OLD_IP}${NC}"

if [ "$OLD_IP" == "$CURRENT_IP" ]; then
    echo -e "${GREEN}✅ IP is already up to date! No migration needed.${NC}\n"
    exit 0
fi

echo -e "${YELLOW}🔄 Migration needed: ${OLD_IP} → ${CURRENT_IP}${NC}\n"

# Confirm with user
read -p "$(echo -e ${BOLD}Continue with migration? This will restart Keycloak. [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Migration cancelled${NC}"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$DATA_BACKUP"
echo -e "\n${GREEN}📁 Created backup directory: ${BACKUP_DIR}${NC}"

# ===================================================================
# STEP 1: Backup Keycloak Database
# ===================================================================
echo -e "\n${BOLD}${BLUE}━━━ STEP 1: Backing Up Database ━━━${NC}\n"

echo -e "${CYAN}📦 Copying database from container...${NC}"

# Copy entire data directory from running container
docker cp $CONTAINER_NAME:/opt/keycloak/data "$DATA_BACKUP/"

if [ ! -d "$DATA_BACKUP/data" ]; then
    echo -e "${RED}❌ Failed to backup database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database backed up to: ${DATA_BACKUP}/data${NC}"

# Calculate backup size
BACKUP_SIZE=$(du -sh "$DATA_BACKUP/data" | awk '{print $1}')
echo -e "${CYAN}📊 Backup size: ${BACKUP_SIZE}${NC}"

# ===================================================================
# STEP 2: Stop and Remove Old Container
# ===================================================================
echo -e "\n${BOLD}${BLUE}━━━ STEP 2: Removing Old Container ━━━${NC}\n"

echo -e "${YELLOW}🛑 Stopping container: ${CONTAINER_NAME}${NC}"
docker stop $CONTAINER_NAME

echo -e "${YELLOW}🗑️  Removing container: ${CONTAINER_NAME}${NC}"
docker rm $CONTAINER_NAME

echo -e "${GREEN}✅ Old container removed${NC}"

# ===================================================================
# STEP 3: Create New Container with New IP
# ===================================================================
echo -e "\n${BOLD}${BLUE}━━━ STEP 3: Creating New Container with Restored Data ━━━${NC}\n"

echo -e "${CYAN}🚀 Starting new Keycloak container with IP: ${CURRENT_IP}${NC}"

# Create container first
docker run -d \
    --name $CONTAINER_NAME \
    -p 8080:8080 \
    -e KEYCLOAK_ADMIN=admin \
    -e KEYCLOAK_ADMIN_PASSWORD=admin \
    -e KC_HOSTNAME=$CURRENT_IP \
    -e KC_HOSTNAME_STRICT=false \
    -e KC_HTTP_ENABLED=true \
    -v "$THEME_PATH:/opt/keycloak/themes/sso-pemda" \
    $IMAGE_NAME \
    start-dev

echo -e "${YELLOW}⏳ Waiting for initial startup (30 seconds)...${NC}"
sleep 30

# Stop container to restore data safely
echo -e "${CYAN}🛑 Stopping container to restore data...${NC}"
docker stop $CONTAINER_NAME

# Restore database
echo -e "${CYAN}📥 Restoring database...${NC}"
docker cp "$DATA_BACKUP/data/." $CONTAINER_NAME:/opt/keycloak/data/

echo -e "${GREEN}✅ Database restored${NC}"

# Start container temporarily to fix permissions
echo -e "${CYAN}🚀 Starting container to fix permissions...${NC}"
docker start $CONTAINER_NAME

echo -e "${YELLOW}⏳ Waiting for container to start (10 seconds)...${NC}"
sleep 10

# Fix permissions so Keycloak user can write to database
echo -e "${CYAN}🔧 Fixing database permissions...${NC}"
docker exec $CONTAINER_NAME chown -R keycloak:root /opt/keycloak/data
docker exec $CONTAINER_NAME chmod -R u+w /opt/keycloak/data

echo -e "${GREEN}✅ Permissions fixed${NC}"

# Restart container to apply all changes
echo -e "${CYAN}🔄 Restarting container...${NC}"
docker restart $CONTAINER_NAME

echo -e "${YELLOW}⏳ Waiting for Keycloak to start (60 seconds)...${NC}"
sleep 60

# Check if container is running
if docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${GREEN}✅ Container started successfully${NC}"
else
    echo -e "${RED}❌ Container failed to start! Check logs with: docker logs ${CONTAINER_NAME}${NC}"
    exit 1
fi

# Wait a bit more for full initialization
echo -e "${YELLOW}⏳ Waiting for full initialization (30 seconds)...${NC}"
sleep 30

# ===================================================================
# SUCCESS!
# ===================================================================
echo -e "\n${BOLD}${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ MIGRATION COMPLETED!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ Keycloak is now running with IP: ${BOLD}${CURRENT_IP}${NC}\n"

echo -e "${CYAN}📋 Next Steps:${NC}\n"
echo -e "  1. Access Keycloak Admin:"
echo -e "     ${BLUE}http://${CURRENT_IP}:8080/admin${NC}\n"
echo -e "  2. Update client redirect URIs (pemda-dashboard client):\n"
echo -e "     ${YELLOW}Root URL: http://${CURRENT_IP}:3000${NC}"
echo -e "     ${YELLOW}Valid Redirect URIs: http://${CURRENT_IP}:3000/*${NC}"
echo -e "     ${YELLOW}Valid Post Logout URIs: http://${CURRENT_IP}:3000/*${NC}"
echo -e "     ${YELLOW}Web Origins: http://${CURRENT_IP}:3000${NC}\n"
echo -e "  3. Update backend/frontend .env files:"
echo -e "     ${BLUE}npm run set-ip${NC}\n"

echo -e "${YELLOW}📦 Database backup saved to: ${DATA_BACKUP}${NC}\n"

echo -e "${GREEN}🎉 All your realms, clients, and users have been preserved!${NC}\n"
