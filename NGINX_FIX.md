# Nginx Configuration Fix

## Issues Identified:
- ❌ Nginx configuration error  
- ❌ Frontend files missing
- ⚠️  Backend health check failed

## Step-by-Step Fix:

### 1. SSH into your VPS
```bash
ssh deploy@157.180.116.88
```

### 2. Check Current Status
```bash
# Check if nginx is installed
nginx -v

# Check nginx status
sudo systemctl status nginx

# Check if TruePal directories exist
ls -la /var/www/truepal/
ls -la /opt/truepal/backend/

# Check current nginx sites
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

### 3. Create TruePal Nginx Site Configuration

**Method 1: Using tee command (recommended)**
```bash
# Create clean nginx configuration using tee
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
```

**Method 2: Manual editing (if tee doesn't work)**
```bash
# Remove any existing broken config
sudo rm -f /etc/nginx/sites-available/truepal

# Create new config file
sudo nano /etc/nginx/sites-available/truepal
```

Then copy and paste this EXACT configuration:
```nginx
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
```

**IMPORTANT**: Save with Ctrl+X, then Y, then Enter in nano.

### 4. Enable the Site
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/truepal /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### 5. Fix Directory Permissions
```bash
# Ensure directories exist with proper permissions
sudo mkdir -p /var/www/truepal/{dist,backups}
sudo mkdir -p /opt/truepal/backend
sudo mkdir -p /var/log/truepal

# Set proper ownership
sudo chown -R www-data:www-data /var/www/truepal
sudo chown -R deploy:deploy /opt/truepal
sudo chown -R deploy:deploy /var/log/truepal

# Set proper permissions
sudo chmod -R 755 /var/www/truepal
sudo chmod -R 755 /opt/truepal
```

### 6. Check Backend is Running
```bash
# Check if backend process is running
pgrep -f "app.jar"

# Check backend logs
tail -f /var/log/truepal/backend.log

# If backend is not running, start it manually
cd /opt/truepal/backend
ls -la
# If app.jar exists:
nohup java -jar app.jar > /var/log/truepal/backend.log 2>&1 &
```

### 7. Check Frontend Files
```bash
# Check if frontend files exist
ls -la /var/www/truepal/dist/

# If empty, the deployment didn't work properly
# Check deployment logs in GitHub Actions
```

### 8. Test Everything
```bash
# Test nginx configuration
sudo nginx -t

# Test frontend
curl http://localhost/health

# Test backend (if running on port 8080)
curl http://localhost:8080/health

# Check processes
ps aux | grep -E "(nginx|java)"
```

### 9. If Issues Persist - Manual Deployment Test
```bash
# Test manual deployment
cd /tmp

# Create a simple index.html for testing
echo "<h1>TruePal Frontend Test</h1>" | sudo tee /var/www/truepal/dist/index.html

# Set permissions
sudo chown www-data:www-data /var/www/truepal/dist/index.html
sudo chmod 644 /var/www/truepal/dist/index.html

# Test in browser: http://157.180.116.88
```

### 10. Add Sudo Permissions for GitHub Actions
```bash
# Edit sudoers for deploy user
sudo visudo

# Add this line for deploy user:
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/chown, /bin/chmod, /bin/mkdir, /bin/cp, /bin/rm, /usr/bin/find, /bin/ls, /usr/bin/xargs, /bin/tar, /usr/bin/tee
```

## Quick Fix Command Sequence:
```bash
# All in one - run these commands on your VPS:
sudo mkdir -p /var/www/truepal/{dist,backups} /opt/truepal/backend /var/log/truepal
sudo chown -R www-data:www-data /var/www/truepal
sudo chown -R deploy:deploy /opt/truepal /var/log/truepal
sudo chmod -R 755 /var/www/truepal /opt/truepal
echo "<h1>TruePal Frontend</h1>" | sudo tee /var/www/truepal/dist/index.html
sudo chown www-data:www-data /var/www/truepal/dist/index.html
sudo nginx -t && sudo systemctl reload nginx
```

After these fixes, trigger a new deployment by pushing a small change to your GitHub repository.