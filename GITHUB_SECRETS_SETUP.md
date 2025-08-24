# GitHub Secrets Configuration

## Required Secrets for GitHub Actions

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### 1. VPS_HOST
- **Name**: `VPS_HOST`
- **Value**: `157.180.116.88`

### 2. VPS_USER
- **Name**: `VPS_USER`  
- **Value**: `deploy`

### 3. VPS_SSH_KEY
- **Name**: `VPS_SSH_KEY`
- **Value**: 
```
-----BEGIN OPENSSH PRIVATE KEY-----
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
-----END OPENSSH PRIVATE KEY-----
```

### 4. VPS_PORT (Optional)
- **Name**: `VPS_PORT`
- **Value**: `22` (default SSH port, only add if different)

## Next Steps

1. **Clean up old deployments**:
   ```bash
   ./cleanup-old-deployments.sh
   ```

2. **Set up these GitHub Secrets** using the values above

3. **Create the workflow file**: 
   - Copy from `FULL_STACK_DEPLOYMENT.md` to `.github/workflows/deploy-fullstack.yml`

4. **Push to master** and watch automatic deployment!

## Quick Test SSH Connection

To verify SSH access works:
```bash
ssh -i /path/to/your/private/key deploy@157.180.116.88
```

Or with password:
```bash
ssh deploy@157.180.116.88
# Password: hrisgood
```