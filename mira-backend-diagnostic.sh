#!/bin/bash
# mira-backend-diagnostic.sh
# Script to diagnose and fix Mira backend startup issues

set -e

echo "🔍 Mira Backend Diagnostic Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/home/peter/mira/backend"
SERVICE_NAME="mira.service"
BINARY_PATH="$BACKEND_DIR/target/release/mira-backend"

echo -e "${BLUE}1. Checking backend directory and binary...${NC}"

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${YELLOW}⚠️  Backend binary not found. Attempting to build...${NC}"
    cd "$BACKEND_DIR"
    cargo build --release
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to build backend${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Backend binary exists${NC}"

echo -e "\n${BLUE}2. Checking binary permissions and dependencies...${NC}"
ls -la "$BINARY_PATH"

# Test if binary runs at all
echo -e "\n${BLUE}3. Testing binary execution...${NC}"
cd "$BACKEND_DIR"
timeout 5s "$BINARY_PATH" --help 2>&1 || {
    echo -e "${YELLOW}⚠️  Binary help test failed, checking dependencies...${NC}"
    ldd "$BINARY_PATH" | head -10
}

echo -e "\n${BLUE}4. Checking environment variables...${NC}"

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set in environment${NC}"
    echo "   This might be set in the systemd service file"
fi

# Check if .env file exists
if [ -f "$BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}✅ Found .env file${NC}"
    echo "   Contents (sensitive values hidden):"
    sed 's/=.*/=***/' "$BACKEND_DIR/.env" | head -10
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
fi

echo -e "\n${BLUE}5. Checking database...${NC}"

if [ -f "$BACKEND_DIR/mira.db" ]; then
    echo -e "${GREEN}✅ Database file exists${NC}"
    ls -la "$BACKEND_DIR/mira.db"
else
    echo -e "${YELLOW}⚠️  Database file not found, will be created on first run${NC}"
fi

echo -e "\n${BLUE}6. Testing manual startup...${NC}"
echo "Attempting to start backend manually for 10 seconds..."

cd "$BACKEND_DIR"
export RUST_LOG=info
export DATABASE_URL="sqlite:./mira.db"

# If OPENAI_API_KEY is not set, provide a placeholder
if [ -z "$OPENAI_API_KEY" ]; then
    export OPENAI_API_KEY="test-key-for-startup-test"
fi

echo "Starting with environment:"
echo "  RUST_LOG=$RUST_LOG"
echo "  DATABASE_URL=$DATABASE_URL"
echo "  OPENAI_API_KEY=${OPENAI_API_KEY:0:10}..."

# Try to start the backend and capture output
timeout 10s "$BINARY_PATH" 2>&1 | head -20 || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
        echo -e "${GREEN}✅ Backend started successfully (killed after timeout)${NC}"
    else
        echo -e "${RED}❌ Backend failed to start (exit code: $exit_code)${NC}"
        echo "Recent logs from journalctl:"
        journalctl -u $SERVICE_NAME -n 20 --no-pager || true
    fi
}

echo -e "\n${BLUE}7. Checking systemd service configuration...${NC}"

systemctl show $SERVICE_NAME --property=LoadState,ActiveState,SubState,ExecMainStatus
echo ""

if systemctl is-enabled $SERVICE_NAME >/dev/null; then
    echo -e "${GREEN}✅ Service is enabled${NC}"
else
    echo -e "${YELLOW}⚠️  Service is not enabled${NC}"
fi

echo -e "\n${BLUE}8. Checking port availability...${NC}"
if netstat -tlnp | grep -q ":3001"; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use:${NC}"
    netstat -tlnp | grep ":3001"
else
    echo -e "${GREEN}✅ Port 3001 is available${NC}"
fi

echo -e "\n${BLUE}9. Recent service logs:${NC}"
echo "Last 10 log entries:"
journalctl -u $SERVICE_NAME -n 10 --no-pager || echo "Could not fetch logs"

echo -e "\n${BLUE}Diagnostic complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. If binary execution failed, check dependencies with: ldd $BINARY_PATH"
echo "2. If environment variables are missing, update the systemd service"
echo "3. If manual startup worked, the issue is likely in systemd configuration"
echo "4. Check the full logs with: journalctl -u $SERVICE_NAME -f"

echo -e "\n${BLUE}To restart the service:${NC}"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl restart $SERVICE_NAME"
echo "sudo systemctl status $SERVICE_NAME"
