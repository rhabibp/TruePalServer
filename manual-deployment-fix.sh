#!/bin/bash

# TruePal Complete Manual Deployment Fix Script
# Run this script on your VPS to fix all deployment issues

echo "🔧 TruePal Complete Deployment Fix Script"
echo "=========================================="

VPS_HOST="157.180.116.88"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Stop and disable old services
echo ""
echo "🛑 Step 1: Stopping old services..."
sudo systemctl stop ktor-app 2>/dev/null || echo "No ktor-app service to stop"
sudo systemctl disable ktor-app 2>/dev/null || echo "No ktor-app service to disable"
sudo pkill -f "ktor-app" || echo "No ktor-app processes to kill"
sudo pkill -f "app.jar" || echo "No app.jar processes to kill"
print_status "Old services stopped"

# Step 2: Create directory structure
echo ""
echo "📁 Step 2: Creating proper directory structure..."
sudo mkdir -p /opt/truepal/backend
sudo mkdir -p /var/log/truepal
sudo mkdir -p /var/www/truepal/{dist,backups}
print_status "Directories created"

# Step 3: Set permissions
echo ""
echo "🔐 Step 3: Setting proper permissions..."
sudo chown -R deploy:deploy /opt/truepal
sudo chown -R deploy:deploy /var/log/truepal
sudo chown -R www-data:www-data /var/www/truepal
sudo chmod -R 755 /opt/truepal
sudo chmod -R 755 /var/www/truepal
print_status "Permissions set"

# Step 4: Fix nginx configuration
echo ""
echo "🌐 Step 4: Configuring nginx..."
sudo tee /etc/nginx/sites-available/truepal > /dev/null << 'EOF'
server {
    listen 80;
    server_name 157.180.116.88;
    
    root /var/www/truepal/dist;
    index index.html;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With" always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    location /health {
        return 200 "healthy";
        add_header Content-Type text/plain;
    }
    
    location /api/health {
        proxy_pass http://localhost:8080/health;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
        
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/truepal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration valid"
    sudo systemctl reload nginx
    print_status "Nginx reloaded"
else
    print_error "Nginx configuration error"
    exit 1
fi

# Step 5: Copy existing frontend files if available
echo ""
echo "📄 Step 5: Setting up frontend files..."
if [ -f "/var/www/truepal/index.html" ]; then
    sudo cp /var/www/truepal/index.html /var/www/truepal/dist/
    [ -d "/var/www/truepal/assets" ] && sudo cp -r /var/www/truepal/assets /var/www/truepal/dist/
    [ -f "/var/www/truepal/favicon.webp" ] && sudo cp /var/www/truepal/favicon.webp /var/www/truepal/dist/
    [ -f "/var/www/truepal/vite.svg" ] && sudo cp /var/www/truepal/vite.svg /var/www/truepal/dist/
    print_status "Existing frontend files copied"
else
    # Create basic frontend file
    sudo tee /var/www/truepal/dist/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TruePal - Loading...</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .loading { color: #666; }
        .status { margin: 20px 0; }
        .backend-status { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>TruePal Application</h1>
    <div class="status">
        <p>🎉 Frontend: <span style="color: green;">Ready</span></p>
        <p>🚀 Backend: <span id="backend-status" class="loading">Checking...</span></p>
    </div>
    <div id="app">
        <p>Frontend deployment in progress...</p>
        <p><small>This page will be replaced by the React frontend after successful deployment.</small></p>
    </div>
    
    <script>
        // Check backend status
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                document.getElementById('backend-status').textContent = 'Connected';
                document.getElementById('backend-status').className = 'backend-status';
            })
            .catch(error => {
                document.getElementById('backend-status').textContent = 'Connecting...';
                document.getElementById('backend-status').className = 'loading';
            });
    </script>
</body>
</html>
EOF
    print_status "Temporary frontend page created"
fi

# Set frontend permissions
sudo chown -R www-data:www-data /var/www/truepal/dist
sudo chmod -R 644 /var/www/truepal/dist/*
sudo chmod 755 /var/www/truepal/dist

# Step 6: Set up sudo permissions for GitHub Actions
echo ""
echo "🔐 Step 6: Setting up sudo permissions for GitHub Actions..."
if ! sudo grep -q "deploy.*NOPASSWD" /etc/sudoers; then
    echo "deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/chown, /bin/chmod, /bin/mkdir, /bin/cp, /bin/rm, /usr/bin/find, /bin/ls, /usr/bin/xargs, /bin/tar, /usr/bin/tee, /bin/pkill" | sudo EDITOR='tee -a' visudo
    print_status "Sudo permissions added for deploy user"
else
    print_warning "Sudo permissions already configured"
fi

# Step 7: Remove old systemd service files
echo ""
echo "🧹 Step 7: Cleaning up old services..."
sudo rm -f /etc/systemd/system/ktor-app.service
sudo systemctl daemon-reload
print_status "Old service files removed"

# Step 8: Test everything
echo ""
echo "🧪 Step 8: Testing deployment..."

# Test nginx
if curl -s http://localhost/health > /dev/null; then
    print_status "Nginx health check passed"
else
    print_error "Nginx health check failed"
fi

# Test frontend
if curl -s http://localhost/ > /dev/null; then
    print_status "Frontend accessible"
else
    print_error "Frontend not accessible"
fi

# Check backend process
if pgrep -f "app.jar" > /dev/null; then
    print_status "Backend process running"
else
    print_warning "Backend process not running (will be started by GitHub Actions)"
fi

# Final status
echo ""
echo "🎉 DEPLOYMENT FIX COMPLETED!"
echo "============================"
echo ""
echo "📊 Status Summary:"
echo "  🌐 Frontend: http://$VPS_HOST"
echo "  🔗 Backend API: http://$VPS_HOST/api"
echo "  ❤️  Health Check: http://$VPS_HOST/health"
echo ""
echo "📝 Next Steps:"
echo "  1. Run 'git push origin master' to trigger GitHub Actions deployment"
echo "  2. Monitor deployment at: https://github.com/rhabibp/TruePalServer/actions"
echo "  3. Test your application at: http://$VPS_HOST"
echo ""
echo "🔍 Verification Commands:"
echo "  curl http://$VPS_HOST/health          # Should return 'healthy'"
echo "  curl http://$VPS_HOST/api/health      # Should return backend health"
echo "  ps aux | grep java                    # Should show backend process"
echo ""