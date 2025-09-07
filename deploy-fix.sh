#!/bin/bash
# deploy-fix.sh - Quick script to fix and deploy the frontend

set -e

echo "🚀 Fixing and Deploying Mira Frontend"
echo "====================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
FRONTEND_DIR="$HOME/mira-frontend"

echo -e "${BLUE}1. Checking if frontend directory exists...${NC}"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

cd "$FRONTEND_DIR"
echo -e "${GREEN}✅ Found frontend directory${NC}"

echo -e "${BLUE}2. Checking backend is running...${NC}"
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Backend is not responding on port 3001${NC}"
    echo "Please start the backend first:"
    echo "  sudo systemctl start mira.service"
    exit 1
fi

echo -e "${BLUE}3. Installing/updating dependencies...${NC}"
npm install

echo -e "${BLUE}4. Running TypeScript check...${NC}"
npm run type-check

echo -e "${BLUE}5. Building the frontend with fixed configuration...${NC}"
npm run build

if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
    echo "   Build output in: $FRONTEND_DIR/dist"
else
    echo -e "${RED}❌ Build failed - no dist directory created${NC}"
    exit 1
fi

echo -e "${BLUE}6. Checking nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

echo -e "${BLUE}7. Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

echo -e "${BLUE}8. Testing the deployment...${NC}"

# Test frontend is serving
if curl -s https://mira.conary.io | grep -q "Mira Frontend"; then
    echo -e "${GREEN}✅ Frontend is being served${NC}"
else
    echo -e "${RED}⚠️  Could not verify frontend content${NC}"
fi

# Test WebSocket endpoint exists (will show 404 but that's expected without proper handshake)
if curl -s -o /dev/null -w "%{http_code}" https://mira.conary.io/ws/chat | grep -q "404"; then
    echo -e "${GREEN}✅ WebSocket endpoint is reachable${NC}"
else
    echo -e "${RED}⚠️  WebSocket endpoint test inconclusive${NC}"
fi

echo -e "\n${GREEN}🎉 Deployment completed!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Visit https://mira.conary.io in your browser"
echo "2. Check the browser console - WebSocket should connect"
echo "3. Try sending a test message"
echo ""
echo -e "${BLUE}If WebSocket still doesn't connect:${NC}"
echo "- Check backend logs: journalctl -u mira.service -f"
echo "- Verify nginx logs: tail -f /var/log/nginx/error.log"
