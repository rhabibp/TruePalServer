# TruePal Deployment Troubleshooting Guide

## 🔍 Current Issues Identified

1. ❌ **Frontend 403 Forbidden** - `/var/www/truepal/dist/` is empty
2. ❌ **Nginx errors** - Missing index.html and favicon.ico
3. ❌ **Backend serialization error** - Health endpoint failing
4. ❌ **Verification script broken** - Missing function definitions

## 🧪 Diagnostic Commands

Run these commands **one by one** on your VPS to diagnose all issues:

### 1. Check Frontend Status
```bash
echo "=== FRONTEND DIRECTORY STATUS ==="
ls -la /var/www/truepal/
echo ""
ls -la /var/www/truepal/dist/
echo ""
echo "Frontend file count:"
find /var/www/truepal/dist/ -type f | wc -l
```

### 2. Check Backend Status
```bash
echo "=== BACKEND STATUS ==="
ps aux | grep java
echo ""
ls -la /opt/truepal/backend/
echo ""
echo "Backend logs (last 10 lines):"
tail -10 /var/log/truepal/backend.log
```

### 3. Check Nginx Status
```bash
echo "=== NGINX STATUS ==="
sudo nginx -t
echo ""
sudo systemctl status nginx --no-pager -l
echo ""
echo "Nginx sites enabled:"
ls -la /etc/nginx/sites-enabled/
```

### 4. Test All Endpoints
```bash
echo "=== ENDPOINT TESTS ==="
echo "Testing nginx health:"
curl -w "Status: %{http_code}\n" http://localhost/health

echo ""
echo "Testing frontend:"
curl -w "Status: %{http_code}\n" -s http://localhost/ | head -5

echo ""
echo "Testing backend direct:"
curl -w "Status: %{http_code}\n" http://localhost:8080/health

echo ""
echo "Testing backend through nginx:"
curl -w "Status: %{http_code}\n" http://localhost/api/health
```

### 5. Check GitHub Actions Logs
Go to: https://github.com/rhabibp/TruePalServer/actions
- Click on latest workflow run
- Check each step for errors
- Look specifically for:
  - "Build frontend" step
  - "Create frontend deployment package" step
  - "Install and configure frontend" step

## 🔧 Fix Commands

### Fix 1: Create Missing Frontend Files
```bash
# Create basic index.html
sudo tee /var/www/truepal/dist/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TruePal</title>
</head>
<body>
    <h1>TruePal Application</h1>
    <p>Frontend: ✅ Working</p>
    <p>Backend: <span id="backend-status">Testing...</span></p>
    
    <script>
        fetch('/api/health')
            .then(r => r.json())
            .then(d => document.getElementById('backend-status').textContent = '✅ Connected')
            .catch(e => document.getElementById('backend-status').textContent = '❌ Error');
    </script>
</body>
</html>
EOF

# Create favicon
sudo touch /var/www/truepal/dist/favicon.ico

# Set permissions
sudo chown -R www-data:www-data /var/www/truepal/dist
sudo chmod 644 /var/www/truepal/dist/*
sudo chmod 755 /var/www/truepal/dist
```

### Fix 2: Test Frontend Access
```bash
# Test after fix
curl http://localhost/
echo ""
curl http://157.180.116.88/
```

### Fix 3: Copy Real Frontend Files (if available)
```bash
# Copy from old location if exists
if [ -f "/var/www/truepal/index.html" ]; then
    sudo cp /var/www/truepal/index.html /var/www/truepal/dist/
    echo "✅ Copied index.html"
fi

if [ -d "/var/www/truepal/assets" ]; then
    sudo cp -r /var/www/truepal/assets /var/www/truepal/dist/
    echo "✅ Copied assets"
fi

if [ -f "/var/www/truepal/favicon.webp" ]; then
    sudo cp /var/www/truepal/favicon.webp /var/www/truepal/dist/
    echo "✅ Copied favicon"
fi

# Fix permissions
sudo chown -R www-data:www-data /var/www/truepal/dist
```

### Fix 4: Fix Backend Health Endpoint
The backend has a serialization error. Check the specific error:
```bash
# Check specific error
grep -A 5 -B 5 "Serializing collections" /var/log/truepal/backend.log
```

### Fix 5: Restart Backend (if needed)
```bash
# Stop backend
sudo pkill -f "app.jar"

# Wait and restart
sleep 5
cd /opt/truepal/backend
nohup java -jar app.jar > /var/log/truepal/backend.log 2>&1 &

# Check if started
sleep 10
ps aux | grep java
```

## 🔍 Workflow Analysis

### Check Frontend Build Step
The workflow might be failing at the frontend build. Check these specific steps in GitHub Actions:

1. **"Setup Node.js"** - Should show Node 18 installation
2. **"Install frontend dependencies"** - Should run `npm ci`
3. **"Build frontend"** - Should run `npm run build`
4. **"Create frontend deployment package"** - Should create tar.gz
5. **"Deploy frontend to VPS"** - Should upload tar.gz
6. **"Install and configure frontend"** - Should extract files

### Common Workflow Issues:

#### Issue: Frontend Build Fails
```bash
# Test locally (on your local machine)
cd frontend
npm ci
npm run build
ls -la dist/
```

#### Issue: Frontend Package Not Created
Check GitHub Actions logs for:
```
tar: frontend/dist: Cannot stat: No such file or directory
```

#### Issue: Frontend Files Not Extracted
Check GitHub Actions logs for:
```
❌ Frontend deployment package not found!
```

## 📊 Complete Status Check
```bash
echo "=== COMPLETE DEPLOYMENT STATUS ==="
echo "Frontend directory files:"
ls -la /var/www/truepal/dist/ | wc -l

echo "Backend process:"
pgrep -f "app.jar" && echo "✅ Running" || echo "❌ Not running"

echo "Nginx status:"
systemctl is-active nginx

echo "Port 8080 (backend):"
ss -tlnp | grep :8080 && echo "✅ Active" || echo "❌ Not listening"

echo "Port 80 (nginx):"
ss -tlnp | grep :80 && echo "✅ Active" || echo "❌ Not listening"

echo ""
echo "=== QUICK ACCESS TEST ==="
curl -s -w "Frontend status: %{http_code}\n" -o /dev/null http://157.180.116.88/
curl -s -w "Health status: %{http_code}\n" -o /dev/null http://157.180.116.88/health
curl -s -w "API status: %{http_code}\n" -o /dev/null http://157.180.116.88/api/health
```

## 🚀 Force New Deployment

If everything else fails, trigger a fresh deployment:

```bash
# On your local machine
echo "# Force deployment $(date)" >> README.md
git add README.md
git commit -m "Force complete redeployment"
git push origin master
```

Then monitor at: https://github.com/rhabibp/TruePalServer/actions

## 📝 Expected Results

After fixes, you should see:
- ✅ Frontend: http://157.180.116.88 (returns HTML page)
- ✅ Health: http://157.180.116.88/health (returns "healthy")
- ✅ Backend: http://157.180.116.88/api/health (returns JSON)
- ✅ Files in `/var/www/truepal/dist/` including `index.html`
- ✅ Java process running from `/opt/truepal/backend/app.jar`

## 🆘 If Still Failing

1. Run the manual fix script: `./manual-deployment-fix.sh`
2. Check GitHub Actions logs for specific errors
3. Verify all GitHub Secrets are set correctly:
   - `VPS_HOST`: 157.180.116.88
   - `VPS_USER`: deploy
   - `VPS_SSH_KEY`: (your private key)

Run the diagnostic commands above and share the output to identify the specific issue!