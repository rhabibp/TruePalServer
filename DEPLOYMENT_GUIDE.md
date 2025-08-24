# TruePal Frontend Deployment Guide

## Current Situation
- Frontend built with React + TypeScript + Vite
- Currently deployed to VPS at `/var/www/truepal/dist/`
- Manual build and upload process is exhausting
- Permission issues after uploads

## Automated Deployment Solutions

### Option 1: GitHub Actions + SSH (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [ main, master ]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Build
      run: |
        cd frontend
        npm run build
    
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          # Backup current deployment
          sudo cp -r /var/www/truepal/dist /var/www/truepal/dist.backup.$(date +%Y%m%d_%H%M%S)
          
          # Remove old files
          sudo rm -rf /var/www/truepal/dist/*
    
    - name: Upload files
      uses: appleboy/scp-action@v0.1.4
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        source: "frontend/dist/*"
        target: "/var/www/truepal/"
        strip_components: 2
        
    - name: Fix permissions
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          # Fix ownership and permissions
          sudo chown -R www-data:www-data /var/www/truepal/dist
          sudo chmod -R 755 /var/www/truepal/dist
          sudo chmod -R 644 /var/www/truepal/dist/*
          
          # Restart nginx if needed
          sudo systemctl reload nginx
```

**Setup GitHub Secrets:**
- `HOST`: Your VPS IP address
- `USERNAME`: SSH username
- `SSH_KEY`: Your private SSH key

### Option 2: Simple Deployment Script

Create `deploy.sh` in your project root:

```bash
#!/bin/bash

# Configuration
VPS_HOST="your-vps-ip"
VPS_USER="your-username"
REMOTE_PATH="/var/www/truepal"
LOCAL_DIST_PATH="frontend/dist"

echo "🔨 Building frontend..."
cd frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "📦 Uploading to VPS..."
cd ..

# Create backup on remote
ssh $VPS_USER@$VPS_HOST "sudo cp -r $REMOTE_PATH/dist $REMOTE_PATH/dist.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# Upload new files
rsync -avz --delete $LOCAL_DIST_PATH/ $VPS_USER@$VPS_HOST:~/temp_dist/

# Move files and fix permissions
ssh $VPS_USER@$VPS_HOST "
    sudo rm -rf $REMOTE_PATH/dist/*
    sudo cp -r ~/temp_dist/* $REMOTE_PATH/dist/
    sudo chown -R www-data:www-data $REMOTE_PATH/dist
    sudo chmod -R 755 $REMOTE_PATH/dist
    sudo chmod -R 644 $REMOTE_PATH/dist/*
    rm -rf ~/temp_dist
    sudo systemctl reload nginx
"

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Usage:
```bash
./deploy.sh
```

### Option 3: PM2 Ecosystem (If using PM2)

Create `ecosystem.config.js`:

```javascript
module.exports = {
  deploy: {
    production: {
      user: 'your-username',
      host: 'your-vps-ip',
      ref: 'origin/master',
      repo: 'your-repo-url',
      path: '/var/www/truepal-source',
      'post-deploy': 'cd frontend && npm install && npm run build && sudo cp -r dist/* /var/www/truepal/dist/ && sudo chown -R www-data:www-data /var/www/truepal/dist && sudo chmod -R 755 /var/www/truepal/dist && sudo systemctl reload nginx'
    }
  }
}
```

Deploy with:
```bash
pm2 deploy production
```

## Permission Fix Solutions

### Quick Permission Fix Script

Create `fix-permissions.sh`:

```bash
#!/bin/bash
VPS_HOST="your-vps-ip"
VPS_USER="your-username"

ssh $VPS_USER@$VPS_HOST "
    sudo chown -R www-data:www-data /var/www/truepal/dist
    sudo chmod -R 755 /var/www/truepal/dist
    sudo chmod -R 644 /var/www/truepal/dist/*
    sudo systemctl reload nginx
"
```

### Permanent Solution - Proper User Setup

Add your user to www-data group on VPS:
```bash
sudo usermod -a -G www-data your-username
```

Set proper umask in your shell profile:
```bash
echo "umask 002" >> ~/.bashrc
```

Create deployment directory with proper permissions:
```bash
sudo mkdir -p /var/www/truepal/dist
sudo chown -R www-data:www-data /var/www/truepal
sudo chmod -R 775 /var/www/truepal
```

## CI/CD Best Practices

1. **Environment Variables**: Store sensitive data in GitHub Secrets
2. **Build Caching**: Use `cache: 'npm'` to speed up builds
3. **Rollback Strategy**: Keep backups of previous deployments
4. **Health Checks**: Add endpoint checks after deployment
5. **Staging Environment**: Deploy to staging first

## Nginx Configuration

Ensure your Nginx config handles SPA routing:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/truepal/dist;
    index index.html;
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Quick Start

1. **Choose Option 1 (GitHub Actions)** for full automation
2. Set up GitHub Secrets
3. Push to master branch
4. Watch automatic deployment

For immediate use:
1. **Use Option 2 (deploy.sh script)**
2. Update VPS details in script
3. Run `./deploy.sh`

This eliminates manual building and uploading while fixing permission issues automatically.