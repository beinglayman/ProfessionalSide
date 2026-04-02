#!/usr/bin/env bash
set -euo pipefail

# Provision Cloudflare resources for InChronicle.
# Prereqs: wrangler auth (wrangler login), flyctl in PATH.
#
# Naming convention:
#   R2 buckets:  ic-<purpose>-<env>     (e.g., ic-uploads-prod)
#   Pages:       ic-<app>-<env>         (e.g., ic-web-prod)
#
# Usage:
#   ./infra/cloudflare-provision.sh              # provisions with defaults
#   ENV=staging ./infra/cloudflare-provision.sh   # provisions staging

# ─── Config ───
ENV="${ENV:-prod}"
APP_PREFIX="ic"
CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-da07998400d83f9a3ad8f585d240e247}"
FLY_APP="${FLY_APP:-inchronicle-api}"

# R2
R2_BUCKET="${APP_PREFIX}-uploads-${ENV}"
R2_PUBLIC_URL="https://uploads.inchronicle.com"

# Fly.io CLI
FLYCTL="${FLYCTL:-fly}"
if ! command -v "$FLYCTL" &>/dev/null; then
  FLYCTL="$HOME/.fly/bin/flyctl"
fi

echo "═══════════════════════════════════════════"
echo " InChronicle Cloudflare Provisioning"
echo " Environment: ${ENV}"
echo " Account ID:  ${CF_ACCOUNT_ID}"
echo "═══════════════════════════════════════════"

# ─── Step 1: R2 Bucket ───
echo ""
echo "── R2 Bucket: ${R2_BUCKET} ──"

if wrangler r2 bucket list 2>/dev/null | grep -q "name:.*${R2_BUCKET}"; then
  echo "✓ Bucket '${R2_BUCKET}' already exists"
else
  echo "Creating R2 bucket '${R2_BUCKET}'..."
  wrangler r2 bucket create "${R2_BUCKET}"
  echo "✓ Bucket '${R2_BUCKET}' created"
fi

# ─── Step 2: R2 API Token ───
echo ""
echo "── R2 API Token ──"
echo "⚠ Wrangler cannot create R2 API tokens via CLI."
echo "  Create manually at: https://dash.cloudflare.com/${CF_ACCOUNT_ID}/r2/api-tokens"
echo "  Permissions: Object Read & Write"
echo "  Scope: bucket '${R2_BUCKET}'"
echo ""
echo "  After creating, run:"
echo "    ${FLYCTL} secrets set \\"
echo "      STORAGE_PROVIDER=\"r2\" \\"
echo "      R2_ACCOUNT_ID=\"${CF_ACCOUNT_ID}\" \\"
echo "      R2_ACCESS_KEY_ID=\"<from-dashboard>\" \\"
echo "      R2_SECRET_ACCESS_KEY=\"<from-dashboard>\" \\"
echo "      R2_BUCKET=\"${R2_BUCKET}\" \\"
echo "      R2_PUBLIC_URL=\"${R2_PUBLIC_URL}\" \\"
echo "      -a ${FLY_APP}"
echo ""

# ─── Step 3: Verify ───
echo "── Verification ──"
echo "Listing R2 buckets..."
wrangler r2 bucket list 2>/dev/null | grep -A1 "${R2_BUCKET}" || echo "⚠ Bucket not found in list"

echo ""
echo "── Upload Test ──"
echo "Testing upload to ${R2_BUCKET}..."
echo "inchronicle-r2-test-$(date +%s)" > /tmp/ic-r2-test.txt
if wrangler r2 object put "${R2_BUCKET}/test/health.txt" --file /tmp/ic-r2-test.txt 2>/dev/null; then
  echo "✓ Upload succeeded"
  echo "Cleaning up test file..."
  wrangler r2 object delete "${R2_BUCKET}/test/health.txt" 2>/dev/null && echo "✓ Cleanup done" || echo "⚠ Cleanup failed (non-critical)"
else
  echo "✗ Upload failed — check permissions"
fi
rm -f /tmp/ic-r2-test.txt

echo ""
echo "═══════════════════════════════════════════"
echo " Done. Summary:"
echo "   R2 Bucket:    ${R2_BUCKET}"
echo "   Account ID:   ${CF_ACCOUNT_ID}"
echo "   Fly.io App:   ${FLY_APP}"
echo ""
echo " Next steps:"
echo "   1. Create R2 API token (link above)"
echo "   2. Set Fly.io secrets (command above)"
echo "   3. Custom domain: uploads.inchronicle.com"
echo "      (after DNS is on Cloudflare)"
echo "═══════════════════════════════════════════"
