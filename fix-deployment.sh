#!/bin/bash

# TruePal Deployment Fix Script
# Run this on your VPS: ssh deploy@157.180.116.88 'bash -s' < fix-deployment.sh

set -e

echo "🚀 Starting TruePal deployment fix..."

# 1. Create directories
echo "📁 Creating directories..."
sudo mkdir -p /opt/truepal/backend
sudo mkdir -p /var/www/truepal/{dist,backups}
sudo mkdir -p /var/log/truepal

# 2. Set permissions
echo "🔐 Setting permissions..."
sudo chown -R deploy:deploy /opt/truepal
sudo chown -R deploy:deploy /var/log/truepal
sudo chown -R www-data:www-data /var/www/truepal
sudo chmod -R 755 /opt/truepal
sudo chmod -R 755 /var/www/truepal

# 3. Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/truepal.service > /dev/null << 'EOF'
[Unit]
Description=TruePal Backend Server
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/truepal/backend
ExecStart=/usr/bin/java -jar /opt/truepal/backend/app.jar
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=truepal
KillMode=process
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

# 4. Enable service
echo "🔄 Enabling systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable truepal

# 5. Create nginx configuration
echo "🌐 Creating nginx configuration..."
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

# 6. Enable nginx site
echo "🔗 Enabling nginx site..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/truepal /etc/nginx/sites-enabled/

# 7. Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# 8. Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

# 9. Create test frontend file
echo "📄 Creating test frontend file..."
echo "<!DOCTYPE html>
<html>
<head>
    <title>TruePal - Ready for Deployment</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        .status { padding: 20px; border-radius: 5px; margin: 20px 0; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>TruePal Frontend</h1>
        <div class='status success'>
            <h2>✅ Deployment Infrastructure Ready!</h2>
            <p>The server is configured and ready for your React application.</p>
            <p>Next: Push to GitHub to trigger deployment.</p>
        </div>
        <div>
            <p><strong>Backend Health:</strong> <a href='/api/health' target='_blank'>Check API Health</a></p>
            <p><strong>Server Time:</strong> $(date)</p>
        </div>
    </div>
</body>
</html>" | sudo tee /var/www/truepal/dist/index.html

sudo chown www-data:www-data /var/www/truepal/dist/index.html

# 10. Update sudoers for deploy user
echo "🔑 Updating sudoers permissions..."
sudo tee -a /etc/sudoers.d/deploy > /dev/null << 'EOF'
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/systemctl daemon-reload, /bin/systemctl enable truepal, /bin/systemctl restart truepal, /bin/chown, /bin/chmod, /bin/mkdir, /bin/cp, /bin/rm, /usr/bin/find, /bin/ls, /usr/bin/xargs, /bin/tar, /usr/bin/tee, /usr/bin/pkill
EOF

# 11. Check PostgreSQL service
echo "🗄️  Checking PostgreSQL..."
if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "⚠️  PostgreSQL is not running - starting it..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

echo ""
echo "🎉 Deployment fix completed!"
echo ""
echo "Next steps:"
echo "1. Test the setup: http://157.180.116.88"
echo "2. Push code to GitHub to trigger deployment"
echo "3. Monitor deployment in GitHub Actions"
echo ""
echo "Debug commands:"
echo "  • Check backend: sudo systemctl status truepal"
echo "  • Check nginx: sudo systemctl status nginx" 
echo "  • Check backend logs: sudo journalctl -u truepal -f"
echo "  • Check nginx logs: sudo tail -f /var/log/nginx/error.log"