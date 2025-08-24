# Windows Users - TruePal CI/CD Deployment Guide

## 🎯 Windows-Specific Instructions

Since you're using Windows, here are the modified commands for your setup:

---

## 🚀 Step 1: Run Cleanup Script (Windows)

### Option 1: PowerShell Script (Recommended)
```powershell
# Navigate to project directory
cd D:\My_All_Projects\TruePalServer

# Run PowerShell script
.\cleanup-old-deployments.ps1
```

### Option 2: If PowerShell execution is restricted
```powershell
# Enable script execution (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run the script
.\cleanup-old-deployments.ps1
```

### Option 3: Manual SSH Commands
If the script doesn't work, you can run commands manually:

```powershell
# Test SSH connection
ssh deploy@157.180.116.88

# If connected successfully, run cleanup commands:
sudo pkill -f "ktor-app" || true
sudo rm -rf /opt/ktor-app
sudo rm -rf /var/www/truepal
sudo mkdir -p /opt/truepal/backend
sudo mkdir -p /var/log/truepal
sudo mkdir -p /var/www/truepal/dist
sudo chown -R deploy:deploy /opt/truepal
sudo chown -R deploy:deploy /var/log/truepal
sudo chown -R www-data:www-data /var/www/truepal

# Exit SSH
exit
```

---

## 📁 Step 2: Create GitHub Workflow (Windows)

### Create directories using PowerShell:
```powershell
# Create .github/workflows directory
New-Item -ItemType Directory -Force -Path ".github\workflows"
```

### Create the workflow file:
```powershell
# Create the workflow file
New-Item -ItemType File -Force -Path ".github\workflows\deploy-fullstack.yml"
```

Then copy the content from `COMPLETE_DEPLOYMENT_GUIDE.md` into the file using your text editor.

---

## 🔧 Step 3: Windows Prerequisites

### Ensure you have OpenSSH Client:
1. Go to **Settings** → **Apps** → **Optional Features**
2. Search for "OpenSSH Client"
3. Install if not already installed

### Test SSH from PowerShell:
```powershell
# Test SSH connection
ssh deploy@157.180.116.88

# Should prompt for password: hrisgood
```

---

## 🚀 Step 4: Deploy from Windows

### Using PowerShell:
```powershell
# Navigate to your project
cd D:\My_All_Projects\TruePalServer

# Add files
git add .

# Commit
git commit -m "Add CI/CD deployment workflow"

# Push (this triggers deployment)
git push origin master
```

### Using Git Bash (Alternative):
If you prefer Git Bash over PowerShell:
```bash
cd /d/My_All_Projects/TruePalServer
git add .
git commit -m "Add CI/CD deployment workflow"
git push origin master
```

---

## 🛠️ Windows-Specific Troubleshooting

### Issue 1: 'ssh' is not recognized
**Solution**: Install OpenSSH Client
```powershell
# Check if SSH is available
Get-Command ssh

# If not found, install via Windows Features
# Settings > Apps > Optional Features > Add a feature > OpenSSH Client
```

### Issue 2: PowerShell Execution Policy
**Solution**:
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass
PowerShell -ExecutionPolicy Bypass -File .\cleanup-old-deployments.ps1
```

### Issue 3: Git Commands
**Make sure Git is in your PATH**:
```powershell
# Check Git installation
git --version

# If not found, download from: https://git-scm.com/download/win
```

### Issue 4: Node.js Commands (for local testing)
```powershell
# Test if Node.js is available
node --version
npm --version

# If not found, download from: https://nodejs.org/
```

---

## 💡 Windows Tips

### 1. Use Windows Terminal (Recommended)
- Download from Microsoft Store
- Better than regular PowerShell/Command Prompt
- Supports multiple tabs

### 2. VS Code Terminal
If using VS Code, you can run all commands in the integrated terminal:
- **Ctrl + `** to open terminal
- Choose PowerShell or Git Bash

### 3. File Paths
Windows uses backslashes, but forward slashes work in most cases:
```powershell
# Both work:
cd D:\My_All_Projects\TruePalServer
cd D:/My_All_Projects/TruePalServer
```

---

## ✅ Quick Windows Setup Checklist

- [ ] OpenSSH Client installed
- [ ] Git installed and configured
- [ ] Node.js installed (for local testing)
- [ ] PowerShell execution policy set
- [ ] SSH connection to VPS tested
- [ ] Cleanup script executed successfully
- [ ] GitHub Secrets configured
- [ ] Workflow file created
- [ ] First deployment pushed

---

## 🚀 Your Complete Windows Workflow

```powershell
# 1. Clean up (one time only)
cd D:\My_All_Projects\TruePalServer
.\cleanup-old-deployments.ps1

# 2. Set up GitHub Secrets (web interface)
# Follow GITHUB_SECRETS_SETUP.md

# 3. Create workflow file
New-Item -ItemType Directory -Force -Path ".github\workflows"
# Copy workflow content to .github\workflows\deploy-fullstack.yml

# 4. Deploy
git add .
git commit -m "Add CI/CD deployment"
git push origin master

# 5. Monitor deployment
# Go to GitHub → Actions tab
```

---

## 🎉 After Successful Setup

Your daily workflow becomes:
```powershell
# Make changes to your code
# Then simply:
git add .
git commit -m "Your changes"
git push origin master

# That's it! Automatic deployment happens!
```

**No more building locally, no more manual uploads, no more permission issues!**

The GitHub Actions will handle everything automatically when you push to master.