# MCP Integration Deployment Checklist

## 🚀 Pre-Deployment Checklist

### 1. OAuth App Configuration

#### GitHub
- [ ] Create production OAuth app
- [ ] Set production homepage URL
- [ ] Set production callback URL: `https://your-domain.com/api/v1/mcp/callback/github`
- [ ] Note Client ID and Secret
- [ ] Verify required scopes: `repo`, `read:user`

#### Jira (if using)
- [ ] Create Atlassian OAuth app
- [ ] Configure production callback URL
- [ ] Set required scopes: `read:jira-work`, `read:jira-user`, `offline_access`
- [ ] Note Client ID and Secret

#### Other Tools
- [ ] Configure each tool's OAuth app with production URLs
- [ ] Document all Client IDs (secrets go in env vars)

### 2. Environment Variables

#### Backend Production Environment
- [ ] Generate secure `MCP_ENCRYPTION_KEY` (32+ characters)
  ```bash
  openssl rand -base64 32
  ```
- [ ] Set all OAuth credentials in production env
- [ ] Update all callback URLs to production domain
- [ ] Verify `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to production URL

#### Required Variables Checklist
```env
✅ MCP_ENCRYPTION_KEY=<secure-32-char-key>
✅ GITHUB_CLIENT_ID=<production-client-id>
✅ GITHUB_CLIENT_SECRET=<production-secret>
✅ GITHUB_REDIRECT_URI=https://your-domain.com/api/v1/mcp/callback/github
✅ FRONTEND_URL=https://your-domain.com
```

### 3. Database Preparation

- [ ] Run Prisma migrations on production database
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify tables created:
  - `mcp_integrations`
  - `mcp_audit_logs`
  - `mcp_daily_summary_preferences`
- [ ] Test database connectivity
- [ ] Verify encryption key works

### 4. Security Review

#### Token Security
- [ ] Verify `MCP_ENCRYPTION_KEY` is unique and secure
- [ ] Confirm tokens are encrypted in database
- [ ] Test token decryption works
- [ ] Verify no plain text tokens in logs

#### API Security
- [ ] HTTPS enforced on all MCP endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Authentication required on all endpoints

#### Privacy Compliance
- [ ] Privacy notices visible at all touchpoints
- [ ] Consent flow working correctly
- [ ] Data deletion endpoint functional
- [ ] Audit logging operational (no data stored)

### 5. Frontend Deployment

- [ ] Build frontend with production API URL
  ```bash
  VITE_API_URL=https://your-domain.com/api/v1 npm run build
  ```
- [ ] Verify MCP components included in bundle
- [ ] Test OAuth redirect URLs
- [ ] Verify privacy notices display correctly

### 6. Railway-Specific (if using Railway)

- [ ] Add MCP environment variables to Railway dashboard
- [ ] Verify database connection string
- [ ] Check build commands include Prisma generation
- [ ] Test OAuth callbacks with Railway URLs
- [ ] Update `FRONTEND_URL` in backend

## 🧪 Testing Checklist

### Functional Testing

#### Connection Flow
- [ ] Navigate to Settings → Integrations
- [ ] Click "Connect" on GitHub
- [ ] Complete OAuth flow
- [ ] Verify tool shows as connected
- [ ] Check audit log entry created

#### Data Import Flow
- [ ] Create new journal entry
- [ ] Click "Import from tools" in Step 3
- [ ] Verify consent dialog appears
- [ ] Confirm data fetch works
- [ ] Review imported data
- [ ] Verify data appears in editor
- [ ] Check session expires after 30 minutes

#### Privacy Features
- [ ] Verify no external data in database
- [ ] Confirm sessions auto-expire
- [ ] Test "Clear session" functionality
- [ ] Verify "Delete all data" works
- [ ] Check audit logs don't contain data

### Error Scenarios
- [ ] Test with expired OAuth token
- [ ] Test with invalid credentials
- [ ] Test with network failures
- [ ] Test with rate limiting
- [ ] Verify graceful error handling

### Performance Testing
- [ ] Load test MCP endpoints
- [ ] Monitor memory usage during sessions
- [ ] Verify session cleanup works
- [ ] Check response times are acceptable

## 📊 Monitoring Setup

### Metrics to Track
- [ ] OAuth connection success rate
- [ ] Data fetch success rate
- [ ] Session creation/expiry counts
- [ ] API response times
- [ ] Error rates by tool type
- [ ] Memory usage for sessions

### Alerts to Configure
- [ ] High error rate on MCP endpoints
- [ ] OAuth token refresh failures
- [ ] Memory usage exceeds threshold
- [ ] Session cleanup failures

### Logging
- [ ] MCP operations logged (no data)
- [ ] OAuth flows logged
- [ ] Error details captured
- [ ] Audit trail maintained

## 🚦 Go-Live Checklist

### Final Verification
- [ ] All environment variables set
- [ ] OAuth apps configured correctly
- [ ] Database migrations completed
- [ ] Security review passed
- [ ] Privacy compliance verified
- [ ] Testing completed successfully

### Communication
- [ ] Update user documentation
- [ ] Prepare privacy policy updates
- [ ] Create user announcement
- [ ] Train support team

### Rollback Plan
- [ ] Document rollback procedure
- [ ] Test rollback process
- [ ] Prepare hotfix process
- [ ] Document emergency contacts

## 📈 Post-Deployment

### Day 1
- [ ] Monitor error rates
- [ ] Check OAuth success rates
- [ ] Verify session management
- [ ] Review user feedback
- [ ] Check system performance

### Week 1
- [ ] Analyze usage patterns
- [ ] Review audit logs
- [ ] Gather user feedback
- [ ] Address any issues
- [ ] Optimize based on metrics

### Month 1
- [ ] Full security audit
- [ ] Performance optimization
- [ ] Feature usage analysis
- [ ] Plan next integrations
- [ ] Update documentation

## 🔧 Maintenance Tasks

### Daily
- [ ] Monitor error rates
- [ ] Check session cleanup
- [ ] Review critical alerts

### Weekly
- [ ] Review audit logs
- [ ] Check OAuth token health
- [ ] Monitor memory usage
- [ ] Update metrics dashboard

### Monthly
- [ ] Rotate OAuth tokens if needed
- [ ] Clean old audit logs (>90 days)
- [ ] Security review
- [ ] Performance analysis
- [ ] Update documentation

## 🚨 Emergency Procedures

### If OAuth Fails
1. Check OAuth app configuration
2. Verify environment variables
3. Review callback URLs
4. Check API rate limits
5. Contact tool support if needed

### If Data Leak Suspected
1. Immediately disable MCP endpoints
2. Review audit logs
3. Check database for external data
4. Investigate session management
5. Notify security team

### If Sessions Not Clearing
1. Manually clear all sessions
2. Restart session service
3. Check memory usage
4. Review cleanup cron job
5. Implement emergency cleanup

## 📝 Sign-off

- [ ] Development Team Lead: ___________________ Date: ___________
- [ ] Security Review: ___________________ Date: ___________
- [ ] Privacy Officer: ___________________ Date: ___________
- [ ] DevOps Lead: ___________________ Date: ___________
- [ ] Product Owner: ___________________ Date: ___________

## Notes

_Use this section to document any deployment-specific notes, issues encountered, or special configurations._

---

**Remember**: Privacy and security are paramount. When in doubt, err on the side of caution and user privacy.