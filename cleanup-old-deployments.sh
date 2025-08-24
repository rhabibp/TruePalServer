#!/bin/bash

# TruePal Deployment Cleanup Script
# This script safely removes old deployments and prepares for new CI/CD setup

echo "🧹 TruePal Deployment Cleanup Script"
echo "======================================"

VPS_HOST="157.180.116.88"
VPS_USER="deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  This script will remove old deployments:${NC}"
echo "   - Backend: /opt/ktor-app"
echo "   - Frontend: /var/www/truepal"
echo ""

# Function to run commands on VPS
run_on_vps() {
    ssh $VPS_USER@$VPS_HOST "$1"
}

# Check if we can connect to VPS
echo "🔍 Testing VPS connection..."
if run_on_vps "echo 'Connection successful'"; then
    echo -e "${GREEN}✅ VPS connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to VPS. Please check your connection.${NC}"
    echo "Make sure to update VPS_HOST and VPS_USER in this script."
    exit 1
fi

echo ""
echo "📋 Current deployment status:"
echo "-----------------------------"

# Check current deployments
echo "🔍 Checking backend deployment (/opt/ktor-app):"
run_on_vps "
if [ -d '/opt/ktor-app' ]; then
    echo '  📁 Directory exists'
    ls -la /opt/ktor-app/ | head -5
    if pgrep -f 'ktor-app' > /dev/null; then
        echo '  🔴 Backend process is RUNNING'
    else
        echo '  ⚪ Backend process is stopped'
    fi
else
    echo '  ⚪ Directory does not exist'
fi
"

echo ""
echo "🔍 Checking frontend deployment (/var/www/truepal):"
run_on_vps "
if [ -d '/var/www/truepal' ]; then
    echo '  📁 Directory exists'
    ls -la /var/www/truepal/ | head -5
else
    echo '  ⚪ Directory does not exist'
fi
"

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will permanently delete the old deployments!${NC}"
read -p "Do you want to proceed with cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
    exit 0
fi

echo ""
echo "🚀 Starting cleanup process..."
echo "==============================="

# Step 1: Stop backend processes
echo "🛑 Stopping backend processes..."
run_on_vps "
if pgrep -f 'ktor-app' > /dev/null; then
    echo '  Stopping ktor-app processes...'
    sudo pkill -f 'ktor-app' || true
    sleep 5
    
    # Force kill if still running
    if pgrep -f 'ktor-app' > /dev/null; then
        echo '  Force killing remaining processes...'
        sudo pkill -9 -f 'ktor-app' || true
        sleep 2
    fi
    
    if pgrep -f 'ktor-app' > /dev/null; then
        echo '  ❌ Some processes still running'
    else
        echo '  ✅ All backend processes stopped'
    fi
else
    echo '  ✅ No backend processes running'
fi
"

# Step 2: Create backups before deletion
echo ""
echo "💾 Creating final backups..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

run_on_vps "
# Create backup directory
sudo mkdir -p /tmp/truepal_final_backups_$BACKUP_TIMESTAMP

# Backup backend if exists
if [ -d '/opt/ktor-app' ]; then
    echo '  📦 Backing up backend...'
    sudo cp -r /opt/ktor-app /tmp/truepal_final_backups_$BACKUP_TIMESTAMP/
    echo '  ✅ Backend backup created'
fi

# Backup frontend if exists
if [ -d '/var/www/truepal' ]; then
    echo '  📦 Backing up frontend...'
    sudo cp -r /var/www/truepal /tmp/truepal_final_backups_$BACKUP_TIMESTAMP/
    echo '  ✅ Frontend backup created'
fi

echo '  📁 Final backups location: /tmp/truepal_final_backups_$BACKUP_TIMESTAMP'
"

# Step 3: Remove old backend deployment
echo ""
echo "🗑️  Removing old backend deployment (/opt/ktor-app)..."
run_on_vps "
if [ -d '/opt/ktor-app' ]; then
    echo '  Removing /opt/ktor-app...'
    sudo rm -rf /opt/ktor-app
    echo '  ✅ Backend directory removed'
else
    echo '  ⚪ Backend directory already clean'
fi
"

# Step 4: Remove old frontend deployment
echo ""
echo "🗑️  Removing old frontend deployment (/var/www/truepal)..."
run_on_vps "
if [ -d '/var/www/truepal' ]; then
    echo '  Removing /var/www/truepal...'
    sudo rm -rf /var/www/truepal
    echo '  ✅ Frontend directory removed'
else
    echo '  ⚪ Frontend directory already clean'
fi
"

# Step 5: Prepare new directory structure
echo ""
echo "📁 Creating new directory structure..."
run_on_vps "
# Create new backend directory structure
echo '  Creating /opt/truepal/backend...'
sudo mkdir -p /opt/truepal/backend
sudo mkdir -p /var/log/truepal
sudo chown -R $USER:$USER /opt/truepal
sudo chown -R $USER:$USER /var/log/truepal

# Create new frontend directory structure  
echo '  Creating /var/www/truepal...'
sudo mkdir -p /var/www/truepal/{dist,backups}
sudo chown -R www-data:www-data /var/www/truepal

echo '  ✅ New directory structure created'
"

# Step 6: Clean up any old systemd services
echo ""
echo "🔧 Cleaning up systemd services..."
run_on_vps "
# Check for old services
if systemctl list-units --full -all | grep -Fq 'ktor-app'; then
    echo '  Stopping and disabling old ktor-app service...'
    sudo systemctl stop ktor-app || true
    sudo systemctl disable ktor-app || true
    sudo rm -f /etc/systemd/system/ktor-app.service || true
    sudo systemctl daemon-reload
    echo '  ✅ Old systemd service removed'
else
    echo '  ⚪ No old systemd services found'
fi
"

# Step 7: Update nginx configuration
echo ""
echo "🌐 Checking nginx configuration..."
run_on_vps "
if [ -f '/etc/nginx/sites-available/truepal' ]; then
    echo '  📝 Nginx site configuration exists'
    echo '  💡 You may need to update proxy_pass URLs for the new backend location'
else
    echo '  ⚠️  No nginx configuration found. You will need to create one.'
fi
"

echo ""
echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
echo "=================================="
echo ""
echo "📋 Summary:"
echo "   ✅ Old backend removed from /opt/ktor-app"
echo "   ✅ Old frontend removed from /var/www/truepal"
echo "   ✅ New directories created:"
echo "      - Backend: /opt/truepal/backend"
echo "      - Frontend: /var/www/truepal/dist"
echo "      - Logs: /var/log/truepal"
echo "   💾 Backups saved to: /tmp/truepal_final_backups_$BACKUP_TIMESTAMP"
echo ""
echo "🚀 Next steps:"
echo "   1. Update your GitHub Actions workflow"
echo "   2. Configure GitHub Secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY)"
echo "   3. Push to master branch to trigger CI/CD deployment"
echo "   4. Monitor the deployment in GitHub Actions"
echo ""
echo -e "${YELLOW}💡 Tip: Keep the backup until you confirm the new deployment works!${NC}"
echo "    To remove backup later: ssh $VPS_USER@$VPS_HOST 'sudo rm -rf /tmp/truepal_final_backups_$BACKUP_TIMESTAMP'"