#!/bin/bash
# Reset all MCP OAuth tokens so user can reconnect with new encryption key

echo "Connecting to database via SSH..."
az webapp ssh --resource-group ps-prod-rg --name ps-backend-1758551070 << 'SSHEOF'
# Inside SSH session
export DATABASE_URL='postgresql://psuser:wVnjV5pfU9SnY4IV68hmdFZFhzFSon8@pspg1758551070.postgres.database.azure.com:5432/psdbprod?sslmode=require'

echo "Resetting MCP integration tokens..."
npx prisma db execute --stdin << 'SQLEOF'
UPDATE "mcp_integrations" 
SET "accessToken" = NULL, 
    "refreshToken" = NULL,
    "isConnected" = false,
    "isActive" = false
WHERE "userId" = 'cmgi30y4h0000m0xb7vmei3cb';
SQLEOF

echo "Tokens reset. Please reconnect tools in Settings → Integrations"
exit
SSHEOF
