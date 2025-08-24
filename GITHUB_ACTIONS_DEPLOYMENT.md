# Complete GitHub Actions Deployment Setup

## Overview
This guide sets up automatic deployment of your React frontend to your VPS whenever you push code to the master branch.

## Step 1: Create GitHub Actions Workflow

### 1.1 Create Directory Structure
In your project root, create these folders:
```
D:\My_All_Projects\TruePalServer\
└── .github/
    └── workflows/
        └── deploy.yml
```

### 1.2 Create the Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy TruePal Frontend

on:
  push:
    branches: [ master, main ]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:  # Allows manual triggering

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Build project
      run: |
        cd frontend
        npm run build
      env:
        NODE_ENV: production
    
    - name: Create deployment package
      run: |
        cd frontend
        tar -czf ../truepal-frontend.tar.gz -C dist .
    
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        script: |
          # Create timestamp for backup
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          
          # Create backup directory if it doesn't exist
          sudo mkdir -p /var/www/truepal/backups
          
          # Backup current deployment
          if [ -d "/var/www/truepal/dist" ]; then
            echo "Creating backup..."
            sudo cp -r /var/www/truepal/dist /var/www/truepal/backups/dist_backup_$TIMESTAMP
            echo "Backup created at /var/www/truepal/backups/dist_backup_$TIMESTAMP"
          fi
          
          # Clean old deployment
          sudo rm -rf /var/www/truepal/dist
          sudo mkdir -p /var/www/truepal/dist
          
          # Set proper ownership for upload
          sudo chown ${{ secrets.VPS_USER }}:${{ secrets.VPS_USER }} /var/www/truepal/dist
    
    - name: Upload build files
      uses: appleboy/scp-action@v0.1.4
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        source: "truepal-frontend.tar.gz"
        target: "/tmp/"
        
    - name: Extract and set permissions
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        script: |
          # Extract files
          cd /tmp
          tar -xzf truepal-frontend.tar.gz -C /var/www/truepal/dist/
          
          # Set proper ownership and permissions
          sudo chown -R www-data:www-data /var/www/truepal/dist
          sudo chmod -R 755 /var/www/truepal/dist
          sudo find /var/www/truepal/dist -type f -exec sudo chmod 644 {} \;
          
          # Clean up
          rm -f /tmp/truepal-frontend.tar.gz
          
          # Test nginx configuration
          sudo nginx -t
          
          # Reload nginx
          sudo systemctl reload nginx
          
          # Clean old backups (keep last 5)
          cd /var/www/truepal/backups
          sudo ls -t | tail -n +6 | sudo xargs -r rm -rf
          
          echo "✅ Deployment completed successfully!"
          echo "🔗 Site should be available at your domain"
```

## Step 2: VPS SSH Key Setup

### 2.1 Generate SSH Key Pair (On Your Local Machine)

```bash
# Generate a new SSH key specifically for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-truepal" -f ~/.ssh/truepal_deploy

# This creates two files:
# ~/.ssh/truepal_deploy (private key)
# ~/.ssh/truepal_deploy.pub (public key)
```

### 2.2 Copy Public Key to VPS

```bash
# Copy the public key to your VPS
ssh-copy-id -i ~/.ssh/truepal_deploy.pub your-username@your-vps-ip

# Or manually add it:
cat ~/.ssh/truepal_deploy.pub
# Copy the output and paste it into your VPS ~/.ssh/authorized_keys file
```

### 2.3 Test SSH Connection

```bash
# Test the connection
ssh -i ~/.ssh/truepal_deploy your-username@your-vps-ip
```

### 2.4 Get Private Key Content

```bash
# Display the private key (you'll need this for GitHub Secrets)
cat ~/.ssh/truepal_deploy
```

**Copy the entire output including the BEGIN and END lines.**

## Step 3: VPS Preparation

### 3.1 SSH into Your VPS and Prepare Directories

```bash
ssh your-username@your-vps-ip

# Create necessary directories
sudo mkdir -p /var/www/truepal/{dist,backups}

# Set initial permissions
sudo chown -R www-data:www-data /var/www/truepal
sudo chmod -R 755 /var/www/truepal

# Add your user to www-data group (optional, for easier management)
sudo usermod -a -G www-data $USER
```

### 3.2 Configure Sudo Permissions (No Password for Nginx)

```bash
# Edit sudoers file
sudo visudo

# Add this line (replace 'your-username' with your actual username):
your-username ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/chown, /bin/chmod, /bin/mkdir, /bin/cp, /bin/rm, /usr/bin/find
```

## Step 4: GitHub Secrets Configuration

### 4.1 Navigate to Your GitHub Repository
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables**
4. Click **Actions**

### 4.2 Add Required Secrets

Click **New repository secret** for each of these:

#### Secret 1: VPS_HOST
- **Name**: `VPS_HOST`
- **Value**: Your VPS IP address (e.g., `192.168.1.100`)

#### Secret 2: VPS_USER
- **Name**: `VPS_USER`
- **Value**: Your VPS username (e.g., `root` or `ubuntu`)

#### Secret 3: VPS_SSH_KEY
- **Name**: `VPS_SSH_KEY`
- **Value**: The entire content of your private key file (`~/.ssh/truepal_deploy`)
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn
... (entire key content)
-----END OPENSSH PRIVATE KEY-----
```

#### Secret 4: VPS_PORT (Optional)
- **Name**: `VPS_PORT`
- **Value**: SSH port (default is `22`, only add if different)

## Step 5: Nginx Configuration

### 5.1 Create/Update Nginx Site Configuration

```bash
# Create nginx site configuration
sudo nano /etc/nginx/sites-available/truepal
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain
    
    root /var/www/truepal/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private no_last_modified no_etag auth;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
    
    # Static assets with long-term caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API proxy (if your backend runs on same server)
    location /api/ {
        proxy_pass http://localhost:8080/;  # Adjust port for your Kotlin backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 5.2 Enable the Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/truepal /etc/nginx/sites-enabled/

# Remove default if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 6: Testing the Setup

### 6.1 Trigger First Deployment

1. Make a small change to any file in the `frontend/` directory
2. Commit and push to master:

```bash
git add .
git commit -m "Test GitHub Actions deployment"
git push origin master
```

### 6.2 Monitor the Deployment

1. Go to your GitHub repository
2. Click on **Actions** tab
3. You should see a workflow running called "Deploy TruePal Frontend"
4. Click on it to see the progress

### 6.3 Verify Deployment

1. SSH into your VPS and check:
```bash
ls -la /var/www/truepal/dist/
# Should show your built files with proper permissions
```

2. Check your website in browser
3. Check nginx logs if issues:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Step 7: Manual Trigger (Optional)

You can also trigger deployment manually:

1. Go to GitHub repository → Actions tab
2. Click on "Deploy TruePal Frontend" workflow
3. Click "Run workflow" button
4. Select branch and click "Run workflow"

## Troubleshooting

### Common Issues:

#### 1. Permission Denied
```bash
# On VPS, fix permissions:
sudo chown -R www-data:www-data /var/www/truepal
sudo chmod -R 755 /var/www/truepal
```

#### 2. SSH Connection Failed
- Check if VPS_HOST, VPS_USER, and VPS_SSH_KEY secrets are correct
- Verify SSH key has been added to VPS authorized_keys
- Check if SSH port is correct (default 22)

#### 3. Build Failed
- Check Node.js version compatibility
- Verify package.json and dependencies
- Check build logs in GitHub Actions

#### 4. Nginx Not Reloading
- Ensure sudo permissions are configured correctly
- Check nginx configuration syntax: `sudo nginx -t`

### Debug Commands on VPS:

```bash
# Check deployment directory
ls -la /var/www/truepal/dist/

# Check nginx status
sudo systemctl status nginx

# Check nginx configuration
sudo nginx -t

# Check recent deployments
ls -la /var/www/truepal/backups/

# Check disk space
df -h /var/www/

# Check logs
sudo journalctl -u nginx -f
```

## Benefits of This Setup

1. **Fully Automated**: Push to master = automatic deployment
2. **Safe**: Creates backups before each deployment
3. **Fast**: Uses npm cache and optimized build process
4. **Secure**: Uses SSH keys, no passwords stored
5. **Reliable**: Handles permissions automatically
6. **Rollback Ready**: Keeps backup of previous versions
7. **Manual Control**: Can trigger deployments manually
8. **Clean**: Removes old backups automatically

## Next Steps

After successful setup, you can:
1. Add SSL certificate with Let's Encrypt
2. Set up staging environment
3. Add deployment notifications (Slack, Discord, email)
4. Add health checks and rollback on failure
5. Set up monitoring and alerts