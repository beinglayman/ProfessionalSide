SELECT 
  "toolType",
  "isConnected",
  "isActive",
  "connectedAt",
  LENGTH("accessToken") as token_length,
  "expiresAt"
FROM "mcp_integrations"
WHERE "userId" = 'cmgi30y4h0000m0xb7vmei3cb'
ORDER BY "connectedAt" DESC;
