!/bin/bash
# Run this to diagnose your Mira backend issues

echo "🔍 Running Mira Backend Diagnostics..."
echo "======================================"

# First, let's check the immediate service logs
echo "1. Recent service logs:"
sudo journalctl -u mira.service -n 20 --no-pager

echo -e "\n2. Checking if backend binary exists:"
ls -la /home/peter/mira/backend/target/release/mira-backend

echo -e "\n3. Testing manual startup (will timeout after 10s):"
cd /home/peter/mira/backend
export RUST_LOG=info
export DATABASE_URL="sqlite:./mira.db"

# Try starting manually to see immediate errors
timeout 10s ./target/release/mira-backend 2>&1 | head -20

echo -e "\n4. Checking environment file:"
if [ -f "/home/peter/mira/backend/.env" ]; then
    echo "✅ .env file exists"
    echo "Environment variables (values hidden):"
    sed 's/=.*/=***/' /home/peter/mira/backend/.env
else
    echo "❌ No .env file found - this might be the issue!"
fi

echo -e "\n5. Checking systemd service file:"
cat /etc/systemd/system/mira.service
