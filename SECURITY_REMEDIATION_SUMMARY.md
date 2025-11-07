# Security Incident Remediation Summary

**Date:** October 28, 2025
**Incident:** API Token Leak via Git History
**Affected Tokens:** Figma API Token, Azure OpenAI API Key

---

## What Happened

Two API secrets were accidentally committed to git history in commit `4b3eda3a734a`:

1. **Figma API Token** - Found in `backend-logs-sprints.zip`
2. **Azure OpenAI API Key** - Hardcoded in `deploy-mcp-agents.sh:38`

Figma detected the leak via GitHub's secret scanning and sent notification email.

---

## ✅ Completed Actions

### 1. Updated `.gitignore`
Added comprehensive exclusions to prevent future leaks:
- `*.zip` - All ZIP files
- `backend-logs*.zip` - Debug log archives
- `deploy-*.sh` - Deployment scripts
- `*.secret`, `*.key`, `*.pem` - Secret files
- `credentials.json` - Credential files

**File:** [.gitignore](.gitignore)

### 2. Fixed `deploy-mcp-agents.sh`
Replaced hardcoded API key with environment variable reference:
```bash
# Before (INSECURE):
AZURE_OPENAI_GPT4O_API_KEY="C1JwALgbuT7vQtSLZbExP9kmiyczWCLS9DZn78Ibwe6eFJBhePZ5JQQJ99BJACHYHv6XJ3w3AAABACOGjjNp"

# After (SECURE):
AZURE_OPENAI_GPT4O_API_KEY="$AZURE_OPENAI_GPT4O_API_KEY"
```

**File:** [deploy-mcp-agents.sh](deploy-mcp-agents.sh:38)

### 3. Deleted Leaked ZIP Files
Removed 18 ZIP files from working directory including:
- `backend-logs-sprints.zip` (contained Figma token)
- All other debug log archives

### 4. Committed Security Fixes
Created commit `4e2ec1b` with all security improvements on branch `test/github-mcp-activity`

---

## 🚨 URGENT: Manual Actions Required

### Step 1: Revoke Compromised Tokens (DO THIS IMMEDIATELY)

#### Figma API Token
1. Go to: https://www.figma.com/settings
2. Navigate to "Personal Access Tokens" section
3. Find and **REVOKE** the leaked token
4. Generate a new token if needed
5. Update token in Azure App Settings (see below)

#### Azure OpenAI API Key
1. Go to: https://portal.azure.com
2. Navigate to your Azure OpenAI resource: **inchronicle-openai**
3. Go to "Keys and Endpoint"
4. Click "**Regenerate Key 1**" (or Key 2 if that was leaked)
5. Copy the new key
6. Update Azure App Settings:
   ```bash
   az webapp config appsettings set \
     -g ps-prod-rg \
     -n ps-backend-1758551070 \
     --settings AZURE_OPENAI_GPT4O_API_KEY="<NEW_KEY_HERE>"
   ```

### Step 2: Clean Git History (AFTER Revoking Tokens)

**⚠️ WARNING:** This rewrites git history. Ensure:
- All tokens are revoked first
- You have a backup
- Team members are notified

#### Option A: Using BFG Repo-Cleaner (Recommended - Easier)

```bash
# Install BFG
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Navigate to repo
cd /Users/honeyarora/Documents/ProfessionalSide

# Remove the leaked ZIP file from history
bfg --delete-files backend-logs-sprints.zip

# Remove the deploy script with hardcoded key
bfg --replace-text <(echo "AZURE_OPENAI_GPT4O_API_KEY=\"C1JwALgbuT7vQtSLZbExP9kmiyczWCLS9DZn78Ibwe6eFJBhePZ5JQQJ99BJACHYHv6XJ3w3AAABACOGjjNp\"==><REDACTED>")

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify secrets are gone
git log --all --full-history --source -- backend-logs-sprints.zip
git log --all --full-history -S "C1JwALgbuT7vQtSLZbExP9kmiyczWCLS9DZn78Ibwe6eFJBhePZ5JQQJ99BJACHYHv6XJ3w3AAABACOGjjNp"
```

#### Option B: Using git-filter-repo (More Control)

```bash
# Install git-filter-repo
brew install git-filter-repo  # macOS
# or: pip3 install git-filter-repo

# Navigate to repo
cd /Users/honeyarora/Documents/ProfessionalSide

# Remove the leaked ZIP file
git filter-repo --path backend-logs-sprints.zip --invert-paths --force

# Remove the API key from deploy script
git filter-repo --replace-text <(echo "C1JwALgbuT7vQtSLZbExP9kmiyczWCLS9DZn78Ibwe6eFJBhePZ5JQQJ99BJACHYHv6XJ3w3AAABACOGjjNp==>REDACTED") --force

# Verify secrets are gone
git log --all --full-history --source -- backend-logs-sprints.zip
git log --all --full-history -S "C1JwALgbuT7vQtSLZbExP9kmiyczWCLS9DZn78Ibwe6eFJBhePZ5JQQJ99BJACHYHv6XJ3w3AAABACOGjjNp"
```

### Step 3: Force Push Clean History

```bash
# Switch to main branch
git checkout main

# Force push to rewrite GitHub history
git push origin main --force

# Force push all other branches
git push origin test/github-mcp-activity --force
git push origin --all --force

# Force push tags (if any)
git push origin --tags --force
```

### Step 4: Allow Azure OpenAI Secret in GitHub

GitHub is blocking pushes because it still detects the secret. After cleaning history:

1. Visit: https://github.com/beinglayman/ProfessionalSide/security/secret-scanning/unblock-secret/34eRjlYGu35xzbUgCX0VF6Ct4vm
2. Click "Allow secret" (since you've revoked it)
3. This allows the clean history to be pushed

### Step 5: Notify Collaborators (If Any)

If you have collaborators:
```bash
# They need to reset their local repos
git fetch origin
git reset --hard origin/main
```

---

## 🛡️ Long-term Prevention

### 1. Install Pre-commit Hook for Secret Scanning

```bash
# Install gitleaks
brew install gitleaks  # macOS

# Add pre-commit hook
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/bash
gitleaks protect --staged --verbose
EOF

chmod +x .git/hooks/pre-commit
```

### 2. Use Azure Key Vault

Store secrets securely:
```bash
# Create Key Vault (if not exists)
az keyvault create \
  --name inchronicle-kv \
  --resource-group ps-prod-rg \
  --location eastus

# Store secrets
az keyvault secret set \
  --vault-name inchronicle-kv \
  --name azure-openai-key \
  --value "<NEW_KEY>"

# Grant Web App access
az webapp identity assign \
  -g ps-prod-rg \
  -n ps-backend-1758551070

# Reference in App Settings
az webapp config appsettings set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --settings AZURE_OPENAI_GPT4O_API_KEY="@Microsoft.KeyVault(SecretUri=https://inchronicle-kv.vault.azure.net/secrets/azure-openai-key/)"
```

### 3. Add Secret Scanning to CI/CD

Update `.github/workflows/` to include gitleaks:
```yaml
- name: Scan for secrets
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 4. Document Secret Handling Procedures

Update [CLAUDE.md](CLAUDE.md) with:
- Never commit secrets
- Always use environment variables
- Use Azure Key Vault for production
- Run gitleaks before committing

---

## Verification Checklist

- [ ] Figma API token revoked and regenerated
- [ ] Azure OpenAI API key rotated in Azure Portal
- [ ] New Azure OpenAI key updated in App Settings
- [ ] Git history cleaned using BFG or git-filter-repo
- [ ] Verified secrets removed: `git log --all -S "<secret>"`
- [ ] Force pushed clean history to GitHub
- [ ] Allowed old secret in GitHub secret scanning (after revocation)
- [ ] Tested application still works with new secrets
- [ ] Installed gitleaks pre-commit hook
- [ ] Documented procedures in CLAUDE.md
- [ ] Notified team members (if any)

---

## References

- **Figma Security Best Practices**: https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens
- **GitHub Secret Scanning**: https://docs.github.com/en/code-security/secret-scanning
- **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/
- **git-filter-repo**: https://github.com/newren/git-filter-repo
- **Azure Key Vault**: https://learn.microsoft.com/en-us/azure/key-vault/

---

## Support

If you encounter issues:
1. **DO NOT** push any commits until tokens are revoked
2. Backup your repo: `git clone --mirror <repo>`
3. Seek help from security team or GitHub support
4. Email Figma: support@figma.com for further assistance

---

**Status:** ✅ Prevention measures implemented, ⏳ Manual token revocation and history cleaning required
