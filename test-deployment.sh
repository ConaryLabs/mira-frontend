#!/bin/bash
# test-deployment.sh - Test if the WebSocket fix worked

echo "🔍 Testing Mira WebSocket Connection"
echo "===================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}1. Testing backend health...${NC}"
if curl -s http://localhost:3001/health | head -1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

echo -e "\n${BLUE}2. Testing frontend serving...${NC}"
if curl -s https://mira.conary.io | grep -q "<!doctype html>"; then
    echo -e "${GREEN}✅ Frontend is being served${NC}"
else
    echo -e "${RED}❌ Frontend serving failed${NC}"
fi

echo -e "\n${BLUE}3. Checking what WebSocket URL is in the built frontend...${NC}"
if grep -r "ws.*mira.conary.io" /home/peter/mira-frontend/dist/ 2>/dev/null; then
    echo -e "${RED}❌ Found hardcoded WebSocket URLs in build${NC}"
else
    echo -e "${GREEN}✅ No hardcoded WebSocket URLs found in build${NC}"
fi

echo -e "\n${BLUE}4. Checking for WebSocket connection code in build...${NC}"
if grep -r "getWebSocketUrl\|ws.*chat" /home/peter/mira-frontend/dist/ 2>/dev/null | head -3; then
    echo -e "${GREEN}✅ Found WebSocket connection code${NC}"
else
    echo -e "${YELLOW}⚠️  WebSocket connection code pattern not found${NC}"
fi

echo -e "\n${BLUE}5. Testing WebSocket endpoint through nginx...${NC}"
# Test if nginx forwards WebSocket requests correctly
response=$(curl -s -o /dev/null -w "%{http_code}" -H "Connection: Upgrade" -H "Upgrade: websocket" https://mira.conary.io/ws/chat 2>/dev/null)
if [ "$response" = "400" ] || [ "$response" = "101" ]; then
    echo -e "${GREEN}✅ WebSocket endpoint is reachable (HTTP $response)${NC}"
elif [ "$response" = "404" ]; then
    echo -e "${RED}❌ WebSocket endpoint returns 404 - nginx routing issue${NC}"
else
    echo -e "${YELLOW}⚠️  WebSocket endpoint returned HTTP $response${NC}"
fi

echo -e "\n${BLUE}6. Checking recent backend WebSocket activity...${NC}"
if sudo journalctl -u mira.service --since "5 minutes ago" | grep -i websocket | tail -3; then
    echo -e "${GREEN}✅ Found recent WebSocket activity${NC}"
else
    echo -e "${YELLOW}⚠️  No recent WebSocket activity in logs${NC}"
fi

echo -e "\n${BLUE}7. Checking if source files were properly updated...${NC}"
if grep -q "getWebSocketUrl.*ws/chat" /home/peter/mira-frontend/src/hooks/useChatState.ts; then
    echo -e "${GREEN}✅ useChatState.ts has been updated with getWebSocketUrl${NC}"
else
    echo -e "${RED}❌ useChatState.ts still has old hardcoded URL${NC}"
    echo "You need to update src/hooks/useChatState.ts with the fixed version"
fi

if grep -q "3001" /home/peter/mira-frontend/src/services/config.ts; then
    echo -e "${GREEN}✅ config.ts has been updated with port 3001${NC}"
else
    echo -e "${RED}❌ config.ts still has old port configuration${NC}"
    echo "You need to update src/services/config.ts with the fixed version"
fi

echo -e "\n${BLUE}8. Forcing browser cache refresh test...${NC}"
# Add cache-busting parameter to test if it's a browser cache issue
timestamp=$(date +%s)
if curl -s "https://mira.conary.io/?v=$timestamp" | grep -q "<!doctype html>"; then
    echo -e "${GREEN}✅ Frontend loads with cache-busting parameter${NC}"
else
    echo -e "${RED}❌ Frontend failed to load with cache-busting${NC}"
fi

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. If source files aren't updated, replace them with the fixed versions"
echo "2. If they are updated, try a hard refresh in browser (Ctrl+Shift+R)"  
echo "3. Check browser console for new WebSocket connection logs"
echo "4. If still failing, we may need to clear browser cache completely"
