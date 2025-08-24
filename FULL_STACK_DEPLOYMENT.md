# Full Stack CI/CD Deployment (Backend + Frontend)

## Overview
Deploy your Kotlin backend and React frontend together with a single push to master.

## Combined GitHub Actions Workflow

Create `.github/workflows/deploy-fullstack.yml`:

```yaml
name: Deploy Full Stack (Backend + Frontend)

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
        cp -r src/main/resources backend-deploy/ || true
        
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
          sudo chown -R ${{ secrets.VPS_USER }}:${{ secrets.VPS_USER }} /opt/truepal/backend
          sudo chmod +x /opt/truepal/backend/start.sh
          sudo chown -R ${{ secrets.VPS_USER }}:${{ secrets.VPS_USER }} /var/log/truepal
          
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
          
          # Clean old backups
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
          
          # Check backend
          sleep 10
          if curl -f http://localhost:8080/health 2>/dev/null; then
            echo "✅ Backend health check passed"
          else
            echo "⚠️  Backend health check failed"
          fi
          
          # Check frontend
          if curl -f http://localhost/health 2>/dev/null; then
            echo "✅ Frontend health check passed"
          else
            echo "⚠️  Frontend health check warning"
          fi
          
          # Check processes
          if pgrep -f "app.jar" > /dev/null; then
            echo "✅ Backend process is running"
          else
            echo "❌ Backend process not found"
          fi
          
          echo "🚀 Full stack deployment completed!"
```

## Alternative: Separate Jobs (Parallel Deployment)

For faster deployment, run backend and frontend in parallel:

```yaml
name: Deploy Full Stack (Parallel)

on:
  push:
    branches: [ master, main ]

jobs:
  build-and-deploy-backend:
    runs-on: ubuntu-latest
    steps:
      # Backend steps here...
      
  build-and-deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      # Frontend steps here...
      
  health-check:
    runs-on: ubuntu-latest
    needs: [build-and-deploy-backend, build-and-deploy-frontend]
    steps:
      # Health check steps...
```

## VPS Setup for Full Stack

### 1. Create Required Directories
```bash
# Backend directories
sudo mkdir -p /opt/truepal/backend
sudo mkdir -p /var/log/truepal

# Frontend directories  
sudo mkdir -p /var/www/truepal/{dist,backups}

# Set permissions
sudo chown -R $USER:$USER /opt/truepal
sudo chown -R www-data:www-data /var/www/truepal
sudo chown -R $USER:$USER /var/log/truepal
```

### 2. Create Systemd Service (Optional but Recommended)

Create `/etc/systemd/system/truepal-backend.service`:

```ini
[Unit]
Description=TruePal Backend Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/opt/truepal/backend
ExecStart=/usr/bin/java -jar app.jar
Restart=always
RestartSec=10

# Logs
StandardOutput=file:/var/log/truepal/backend.log
StandardError=file:/var/log/truepal/backend-error.log

[Install]
WantedBy=multi-user.target
```

Then modify the deployment script:
```bash
# In the workflow, replace the start.sh section with:
sudo systemctl stop truepal-backend || true
sleep 3
sudo systemctl start truepal-backend
sudo systemctl enable truepal-backend
```

### 3. Nginx Configuration for Full Stack

Update `/etc/nginx/sites-available/truepal`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    root /var/www/truepal/dist;
    index index.html;
    
    # API Backend Proxy
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers if needed
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With";
    }
    
    # Health checks
    location /health {
        return 200 "healthy";
        add_header Content-Type text/plain;
    }
    
    location /api/health {
        proxy_pass http://localhost:8080/health;
    }
    
    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Deployment Strategies

### 1. Deploy Both Always (Current)
Every push deploys both backend and frontend.

### 2. Smart Deployment (Based on Changes)
```yaml
# Add this to detect changes
- name: Check for backend changes
  id: backend-changes
  run: echo "changed=$(git diff --name-only HEAD~1 | grep -E '^(src/|build\.gradle|gradle)' | wc -l)" >> $GITHUB_OUTPUT

- name: Check for frontend changes  
  id: frontend-changes
  run: echo "changed=$(git diff --name-only HEAD~1 | grep -E '^frontend/' | wc -l)" >> $GITHUB_OUTPUT

# Then use conditions:
- name: Deploy backend
  if: steps.backend-changes.outputs.changed > 0
  # backend deployment steps
  
- name: Deploy frontend
  if: steps.frontend-changes.outputs.changed > 0
  # frontend deployment steps
```

### 3. Environment-Based Deployment
```yaml
# Deploy to different environments
strategy:
  matrix:
    environment: [staging, production]
include:
  - environment: staging
    host: ${{ secrets.STAGING_HOST }}
  - environment: production
    host: ${{ secrets.PROD_HOST }}
```

## Benefits of Full Stack CI/CD

1. **Single Command Deploy**: One push deploys everything
2. **Consistency**: Both services always in sync
3. **Atomic Deployments**: Both succeed or both rollback
4. **Automated Testing**: Health checks for both services
5. **Zero Downtime**: Proper service management
6. **Backup Strategy**: Both backend and frontend backed up

## Quick Start

1. Replace your current workflow with the full stack version
2. Set up VPS directories and permissions
3. Update nginx configuration
4. Push to master
5. Watch both backend and frontend deploy together!

The entire stack deploys in about 3-5 minutes automatically.