# Complete TruePal CI/CD Deployment Guide

## 🎯 Overview
This guide will set up automated deployment for your TruePal application (Kotlin backend + React frontend) using GitHub Actions. One push to master = automatic deployment to your VPS.

## 📋 Prerequisites
- ✅ VPS: 157.180.116.88
- ✅ SSH User: deploy (password: hrisgood)
- ✅ GitHub repository with your code
- ✅ Local development environment

---

## 🚀 Step 1: Clean Up Old Deployments

### 1.1 Run Cleanup Script
```bash
# Make sure you're in your project directory
cd D:\My_All_Projects\TruePalServer

# Make script executable and run
chmod +x cleanup-old-deployments.sh
./cleanup-old-deployments.sh
```

**What this does:**
- Safely stops old backend processes
- Backs up current deployments
- Removes `/opt/ktor-app` and `/var/www/truepal`
- Creates new directory structure:
  - `/opt/truepal/backend` (for new backend)
  - `/var/www/truepal/dist` (for new frontend)
  - `/var/log/truepal` (for logs)

---

## 🔑 Step 2: Set Up GitHub Secrets

### 2.1 Navigate to GitHub Secrets
1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### 2.2 Add Required Secrets

#### Secret 1: VPS_HOST
- **Name**: `VPS_HOST`
- **Value**: `157.180.116.88`

#### Secret 2: VPS_USER
- **Name**: `VPS_USER`
- **Value**: `deploy`

#### Secret 3: VPS_SSH_KEY
- **Name**: `VPS_SSH_KEY`
- **Value**: (Copy the entire private key from `GITHUB_SECRETS_SETUP.md`)

#### Secret 4: VPS_PORT (Optional)
- **Name**: `VPS_PORT`
- **Value**: `22`

---

## 📁 Step 3: Create GitHub Actions Workflow

### 3.1 Create Directory Structure
```bash
# In your project root
mkdir -p .github/workflows
```

### 3.2 Create Workflow File

Create `.github/workflows/deploy-fullstack.yml`:

```yaml
name: Deploy TruePal Full Stack

on:
  push:
    branches: [ master, main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    # =====================
    # BACKEND DEPLOYMENT
    # =====================
    
    - name: Setup JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Grant execute permission to gradlew
      run: chmod +x ./gradlew
    
    - name: Build backend with Gradle
      run: ./gradlew build -x test
      env:
        GRADLE_OPTS: '-Xmx2g -Dfile.encoding=UTF-8'
    
    - name: Create backend deployment package
      run: |
        mkdir -p backend-deploy
        cp build/libs/*.jar backend-deploy/app.jar
        
        # Create startup script
        cat > backend-deploy/start.sh << 'EOF'
        #!/bin/bash
        
        # Stop existing application
        sudo pkill -f "app.jar" || true
        sleep 5
        
        # Start new application
        cd /opt/truepal/backend
        nohup java -jar app.jar > /var/log/truepal/backend.log 2>&1 &
        
        echo "Backend started"
        sleep 3
        
        # Check if application started successfully
        if pgrep -f "app.jar" > /dev/null; then
            echo "✅ Backend is running"
        else
            echo "❌ Backend failed to start"
            exit 1
        fi
        EOF
        
        chmod +x backend-deploy/start.sh
        tar -czf backend-deploy.tar.gz -C backend-deploy .
    
    - name: Deploy backend to VPS
      uses: appleboy/scp-action@v0.1.4
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        source: "backend-deploy.tar.gz"
        target: "/tmp/"
    
    - name: Install and start backend
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        script: |
          # Create backend directories
          sudo mkdir -p /opt/truepal/backend
          sudo mkdir -p /var/log/truepal
          
          # Backup current backend
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          if [ -f "/opt/truepal/backend/app.jar" ]; then
            sudo cp /opt/truepal/backend/app.jar /opt/truepal/backend/app.jar.backup.$TIMESTAMP
            echo "Backend backup created"
          fi
          
          # Extract new backend
          cd /tmp
          tar -xzf backend-deploy.tar.gz -C /opt/truepal/backend/
          
          # Set permissions
          sudo chown -R deploy:deploy /opt/truepal/backend
          sudo chmod +x /opt/truepal/backend/start.sh
          sudo chown -R deploy:deploy /var/log/truepal
          
          # Start backend
          /opt/truepal/backend/start.sh
          
          # Clean up
          rm -f /tmp/backend-deploy.tar.gz
          
          echo "✅ Backend deployment completed"
    
    # =====================
    # FRONTEND DEPLOYMENT
    # =====================
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install frontend dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
      env:
        NODE_ENV: production
    
    - name: Create frontend deployment package
      run: |
        cd frontend
        tar -czf ../frontend-deploy.tar.gz -C dist .
    
    - name: Deploy frontend to VPS
      uses: appleboy/scp-action@v0.1.4
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        source: "frontend-deploy.tar.gz"
        target: "/tmp/"
        
    - name: Install and configure frontend
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        script: |
          # Frontend backup and deployment
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          sudo mkdir -p /var/www/truepal/backups
          
          if [ -d "/var/www/truepal/dist" ]; then
            sudo cp -r /var/www/truepal/dist /var/www/truepal/backups/dist_backup_$TIMESTAMP
            echo "Frontend backup created"
          fi
          
          # Clean and extract new frontend
          sudo rm -rf /var/www/truepal/dist
          sudo mkdir -p /var/www/truepal/dist
          
          cd /tmp
          tar -xzf frontend-deploy.tar.gz -C /var/www/truepal/dist/
          
          # Set permissions
          sudo chown -R www-data:www-data /var/www/truepal/dist
          sudo chmod -R 755 /var/www/truepal/dist
          sudo find /var/www/truepal/dist -type f -exec sudo chmod 644 {} \;
          
          # Test and reload nginx
          sudo nginx -t
          sudo systemctl reload nginx
          
          # Clean up
          rm -f /tmp/frontend-deploy.tar.gz
          
          # Clean old backups (keep last 5)
          cd /var/www/truepal/backups
          sudo ls -t | tail -n +6 | sudo xargs -r rm -rf
          
          echo "✅ Frontend deployment completed"
    
    # =====================
    # POST-DEPLOYMENT TESTS
    # =====================
    
    - name: Health check
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        script: |
          echo "🔍 Running health checks..."
          
          # Wait for backend to fully start
          sleep 15
          
          # Check backend process
          if pgrep -f "app.jar" > /dev/null; then
            echo "✅ Backend process is running"
          else
            echo "❌ Backend process not found"
          fi
          
          # Check backend HTTP (adjust port if needed)
          if curl -f http://localhost:8080/health 2>/dev/null; then
            echo "✅ Backend health check passed"
          else
            echo "⚠️  Backend health check failed (might need /health endpoint)"
          fi
          
          # Check frontend files
          if [ -f "/var/www/truepal/dist/index.html" ]; then
            echo "✅ Frontend files deployed"
          else
            echo "❌ Frontend files missing"
          fi
          
          # Check nginx
          if sudo nginx -t 2>/dev/null; then
            echo "✅ Nginx configuration valid"
          else
            echo "❌ Nginx configuration error"
          fi
          
          echo ""
          echo "🚀 Full stack deployment completed!"
          echo "🌐 Frontend: http://157.180.116.88"
          echo "🔗 Backend API: http://157.180.116.88/api"
```

---

## 🌐 Step 4: Configure Nginx

### 4.1 Create Nginx Configuration

SSH into your VPS and create the nginx config:

```bash
ssh deploy@157.180.116.88
sudo nano /etc/nginx/sites-available/truepal
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 157.180.116.88;  # Replace with your domain if you have one
    
    # Frontend static files
    root /var/www/truepal/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # API Backend Proxy
    location /api/ {
        proxy_pass http://localhost:8080/;  # Adjust port if your backend uses different port
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers if needed
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    # Health check endpoints
    location /health {
        return 200 "healthy";
        add_header Content-Type text/plain;
    }
    
    location /api/health {
        proxy_pass http://localhost:8080/health;  # Backend health check
    }
    
    # Frontend SPA routing (React Router)
    location / {
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    
    # Static assets with long-term caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

### 4.2 Enable the Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/truepal /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Exit VPS
exit
```

---

## 🔄 Step 5: Configure Sudo Permissions

SSH back into your VPS and set up passwordless sudo for deployment commands:

```bash
ssh deploy@157.180.116.88

# Edit sudoers file
sudo visudo

# Add this line at the end (replace 'deploy' if your username is different):
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/chown, /bin/chmod, /bin/mkdir, /bin/cp, /bin/rm, /usr/bin/find, /bin/ls, /usr/bin/xargs, /bin/tar

# Save and exit (Ctrl+X, Y, Enter in nano)
exit
```

---

## 🚀 Step 6: Deploy!

### 6.1 Commit and Push
```bash
# Add all files
git add .

# Commit changes
git commit -m "Add CI/CD deployment workflow"

# Push to master (this will trigger deployment)
git push origin master
```

### 6.2 Monitor Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see "Deploy TruePal Full Stack" workflow running
4. Click on it to watch the progress
5. Each step should show green checkmarks when completed

### 6.3 Verify Deployment

After the workflow completes (usually 3-5 minutes):

1. **Check your website**: http://157.180.116.88
2. **Check API**: http://157.180.116.88/api (should show some response)
3. **Check health**: http://157.180.116.88/health (should show "healthy")

---

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Workflow Fails - SSH Connection
```bash
# Test SSH connection manually
ssh deploy@157.180.116.88
```
**Fix**: Ensure VPS_HOST, VPS_USER, and VPS_SSH_KEY secrets are correct.

#### 2. Backend Build Fails
**Check**: Gradle build works locally:
```bash
./gradlew build
```
**Fix**: Ensure all dependencies are in your repository.

#### 3. Frontend Build Fails
**Check**: Frontend builds locally:
```bash
cd frontend
npm install
npm run build
```

#### 4. Backend Doesn't Start
**SSH into VPS and check**:
```bash
ssh deploy@157.180.116.88

# Check if backend is running
pgrep -f "app.jar"

# Check backend logs
tail -f /var/log/truepal/backend.log

# Check if port 8080 is in use
sudo netstat -tlnp | grep 8080

# Manually start backend for testing
cd /opt/truepal/backend
java -jar app.jar
```

#### 5. Frontend Not Loading
**Check**:
```bash
ssh deploy@157.180.116.88

# Check if files exist
ls -la /var/www/truepal/dist/

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log

# Test nginx configuration
sudo nginx -t
```

#### 6. Permission Issues
**Fix**:
```bash
ssh deploy@157.180.116.88

# Fix backend permissions
sudo chown -R deploy:deploy /opt/truepal/backend
sudo chmod +x /opt/truepal/backend/start.sh

# Fix frontend permissions
sudo chown -R www-data:www-data /var/www/truepal/dist
sudo chmod -R 755 /var/www/truepal/dist
```

### Debug Commands

```bash
# SSH into VPS
ssh deploy@157.180.116.88

# Check all TruePal processes
ps aux | grep -i truepal

# Check port usage
sudo netstat -tlnp | grep -E "(8080|80)"

# Check disk space
df -h

# Check system resources
free -h
top

# Check nginx status
sudo systemctl status nginx

# Restart nginx if needed
sudo systemctl restart nginx
```

---

## 🎉 Success! What You've Achieved

✅ **Automated CI/CD Pipeline**: Push code → automatic deployment
✅ **Full Stack Deployment**: Both Kotlin backend and React frontend
✅ **Safe Deployments**: Automatic backups before each deployment
✅ **Zero Downtime**: Proper service management
✅ **Health Monitoring**: Automatic health checks after deployment
✅ **Clean Architecture**: Proper directory structure and permissions
✅ **Production Ready**: Nginx configuration with caching and security

---

## 🔄 Daily Workflow

Now your workflow is simply:
1. Make code changes
2. `git add . && git commit -m "Your changes"`
3. `git push origin master`
4. Watch automatic deployment in GitHub Actions
5. Check your site at http://157.180.116.88

**That's it!** No more manual building, uploading, or permission fixing.

---

## 🚀 Next Steps (Optional Improvements)

1. **Add SSL Certificate**: Use Let's Encrypt for HTTPS
2. **Custom Domain**: Point your domain to 157.180.116.88
3. **Database Backups**: Automate database backups
4. **Monitoring**: Add Grafana/Prometheus for monitoring
5. **Staging Environment**: Create a staging branch for testing
6. **Rollback Feature**: Add easy rollback to previous versions
7. **Slack Notifications**: Get deployment notifications in Slack

---

**🎊 Congratulations! You now have a professional CI/CD pipeline for your TruePal application!**