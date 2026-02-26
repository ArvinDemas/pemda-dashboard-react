#!/bin/bash

# ===================================================================
# PEMDA Dashboard - IP Update Helper Script
# ===================================================================
# This script can be run from ANYWHERE on your Mac
# No need to cd to project directory first!
# ===================================================================

# Color codes for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PEMDA Dashboard - IP Update Tool${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Navigate to project directory
echo -e "${GREEN}📂 Navigating to project directory...${NC}"
cd "$SCRIPT_DIR/.."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}❌ Error: package.json not found!${NC}"
    echo -e "${YELLOW}   This script must be in the project root directory.${NC}"
    exit 1
fi

# Run the IP update script
echo -e "${GREEN}🚀 Running IP update...${NC}"
echo ""

npm run set-ip

# Exit with the same status code as npm command
exit $?
