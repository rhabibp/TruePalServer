# TruePal Deployment Cleanup Script (Windows PowerShell)
# This script safely removes old deployments and prepares for new CI/CD setup

Write-Host "🧹 TruePal Deployment Cleanup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$VPS_HOST = "157.180.116.88"
$VPS_USER = "deploy"

Write-Host "⚠️  This script will remove old deployments:" -ForegroundColor Yellow
Write-Host "   - Backend: /opt/ktor-app" -ForegroundColor White
Write-Host "   - Frontend: /var/www/truepal" -ForegroundColor White
Write-Host ""

# Function to run SSH commands
function Invoke-SSH {
    param(
        [string]$Command
    )
    
    # Use ssh command (requires OpenSSH client on Windows)
    ssh "$VPS_USER@$VPS_HOST" $Command
}

# Test SSH connection
Write-Host "🔍 Testing VPS connection..." -ForegroundColor White

try {
    $testResult = Invoke-SSH "echo 'Connection successful'"
    if ($testResult -match "Connection successful") {
        Write-Host "✅ VPS connection successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Connection test failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Cannot connect to VPS. Error: $_" -ForegroundColor Red
    Write-Host "Make sure you have OpenSSH client installed on Windows." -ForegroundColor Yellow
    Write-Host "You can install it via: Settings > Apps > Optional Features > OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Current deployment status:" -ForegroundColor White
Write-Host "-----------------------------" -ForegroundColor White

# Check current deployments
Write-Host "🔍 Checking backend deployment (/opt/ktor-app):" -ForegroundColor White
Invoke-SSH @"
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
"@

Write-Host ""
Write-Host "🔍 Checking frontend deployment (/var/www/truepal):" -ForegroundColor White
Invoke-SSH @"
if [ -d '/var/www/truepal' ]; then
    echo '  📁 Directory exists'
    ls -la /var/www/truepal/ | head -5
else
    echo '  ⚪ Directory does not exist'
fi
"@

Write-Host ""
Write-Host "⚠️  WARNING: This will permanently delete the old deployments!" -ForegroundColor Yellow
$confirm = Read-Host "Do you want to proceed with cleanup? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting cleanup process..." -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Step 1: Stop backend processes
Write-Host "🛑 Stopping backend processes..." -ForegroundColor White
Invoke-SSH @"
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
"@

# Step 2: Create backups before deletion
Write-Host ""
Write-Host "💾 Creating final backups..." -ForegroundColor White
$BACKUP_TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

Invoke-SSH @"
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
"@

# Step 3: Remove old backend deployment
Write-Host ""
Write-Host "🗑️  Removing old backend deployment (/opt/ktor-app)..." -ForegroundColor White
Invoke-SSH @"
if [ -d '/opt/ktor-app' ]; then
    echo '  Removing /opt/ktor-app...'
    sudo rm -rf /opt/ktor-app
    echo '  ✅ Backend directory removed'
else
    echo '  ⚪ Backend directory already clean'
fi
"@

# Step 4: Remove old frontend deployment
Write-Host ""
Write-Host "🗑️  Removing old frontend deployment (/var/www/truepal)..." -ForegroundColor White
Invoke-SSH @"
if [ -d '/var/www/truepal' ]; then
    echo '  Removing /var/www/truepal...'
    sudo rm -rf /var/www/truepal
    echo '  ✅ Frontend directory removed'
else
    echo '  ⚪ Frontend directory already clean'
fi
"@

# Step 5: Prepare new directory structure
Write-Host ""
Write-Host "📁 Creating new directory structure..." -ForegroundColor White
Invoke-SSH @"
# Create new backend directory structure
echo '  Creating /opt/truepal/backend...'
sudo mkdir -p /opt/truepal/backend
sudo mkdir -p /var/log/truepal
sudo chown -R deploy:deploy /opt/truepal
sudo chown -R deploy:deploy /var/log/truepal

# Create new frontend directory structure  
echo '  Creating /var/www/truepal...'
sudo mkdir -p /var/www/truepal/{dist,backups}
sudo chown -R www-data:www-data /var/www/truepal

echo '  ✅ New directory structure created'
"@

# Step 6: Clean up any old systemd services
Write-Host ""
Write-Host "🔧 Cleaning up systemd services..." -ForegroundColor White
Invoke-SSH @"
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
"@

# Step 7: Update nginx configuration
Write-Host ""
Write-Host "🌐 Checking nginx configuration..." -ForegroundColor White
Invoke-SSH @"
if [ -f '/etc/nginx/sites-available/truepal' ]; then
    echo '  📝 Nginx site configuration exists'
    echo '  💡 You may need to update proxy_pass URLs for the new backend location'
else
    echo '  ⚠️  No nginx configuration found. You will need to create one.'
fi
"@

Write-Host ""
Write-Host "✅ Cleanup completed successfully!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor White
Write-Host "   ✅ Old backend removed from /opt/ktor-app" -ForegroundColor Green
Write-Host "   ✅ Old frontend removed from /var/www/truepal" -ForegroundColor Green
Write-Host "   ✅ New directories created:" -ForegroundColor Green
Write-Host "      - Backend: /opt/truepal/backend" -ForegroundColor White
Write-Host "      - Frontend: /var/www/truepal/dist" -ForegroundColor White
Write-Host "      - Logs: /var/log/truepal" -ForegroundColor White
Write-Host "   💾 Backups saved to: /tmp/truepal_final_backups_$BACKUP_TIMESTAMP" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Set up GitHub Secrets (see GITHUB_SECRETS_SETUP.md)" -ForegroundColor White
Write-Host "   2. Create workflow file (.github/workflows/deploy-fullstack.yml)" -ForegroundColor White
Write-Host "   3. Configure nginx (see COMPLETE_DEPLOYMENT_GUIDE.md)" -ForegroundColor White
Write-Host "   4. Push to master branch to trigger CI/CD deployment" -ForegroundColor White
Write-Host "   5. Monitor the deployment in GitHub Actions" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Keep the backup until you confirm the new deployment works!" -ForegroundColor Yellow
Write-Host "    To remove backup later: ssh deploy@157.180.116.88 'sudo rm -rf /tmp/truepal_final_backups_$BACKUP_TIMESTAMP'" -ForegroundColor Gray

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")