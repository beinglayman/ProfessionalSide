#!/usr/bin/env bash
set -euo pipefail

# This script provisions Azure resources for InChronicle.
# Prereqs: az login (or AZURE_CREDENTIALS via GitHub Actions), az CLI v2.50+.

if [[ ! -f "$(dirname "$0")/.env" ]]; then
  echo "Missing infra/.env. Copy infra/.env.example and fill values." >&2
  exit 1
fi

source "$(dirname "$0")/.env"

echo "Using subscription: $AZ_SUBSCRIPTION"
az account set --subscription "$AZ_SUBSCRIPTION"

echo "Creating resource group $AZ_RG in $AZ_REGION"
az group create -n "$AZ_RG" -l "$AZ_REGION" >/dev/null

echo "Creating ACR $ACR_NAME"
az acr create -g "$AZ_RG" -n "$ACR_NAME" --sku Basic >/dev/null || true

echo "Creating Postgres Flexible Server $PG_NAME"
az postgres flexible-server create -g "$AZ_RG" -n "$PG_NAME" -u "$PG_USER" -p "$PG_PASS" -l "$AZ_REGION" --tier Burstable --sku-name B1ms || true
az postgres flexible-server db create -g "$AZ_RG" -s "$PG_NAME" -d "$PG_DB" || true
az postgres flexible-server firewall-rule create -g "$AZ_RG" -n AllowAllAzureIPs -s "$PG_NAME" --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 || true

DB_URL="postgresql://$PG_USER:$PG_PASS@$PG_NAME.postgres.database.azure.com:5432/$PG_DB?sslmode=require"

echo "Creating Storage Account $STORAGE_NAME and file share 'uploads'"
az storage account create -g "$AZ_RG" -n "$STORAGE_NAME" -l "$AZ_REGION" --sku Standard_LRS >/dev/null || true
STORAGE_KEY=$(az storage account keys list -g "$AZ_RG" -n "$STORAGE_NAME" --query "[0].value" -o tsv)
az storage share-rm create --resource-group "$AZ_RG" --storage-account "$STORAGE_NAME" --name uploads >/dev/null || true

echo "Creating App Service Plan $PLAN_NAME"
az appservice plan create -g "$AZ_RG" -n "$PLAN_NAME" --is-linux --sku B1 >/dev/null || true

echo "Creating Backend Web App $BACKEND_APPNAME"
ACR_LOGIN_SERVER=$(az acr show -n "$ACR_NAME" -g "$AZ_RG" --query loginServer -o tsv)
az webapp create -g "$AZ_RG" -p "$PLAN_NAME" -n "$BACKEND_APPNAME" --deployment-container-image-name "$ACR_LOGIN_SERVER/inchronicle-backend:latest" >/dev/null || true

echo "Assigning identity and ACR pull role"
PRINCIPAL_ID=$(az webapp identity assign -g "$AZ_RG" -n "$BACKEND_APPNAME" --query principalId -o tsv)
ACR_ID=$(az acr show -n "$ACR_NAME" -g "$AZ_RG" --query id -o tsv)
az role assignment create --assignee "$PRINCIPAL_ID" --scope "$ACR_ID" --role "AcrPull" >/dev/null || true

echo "Configuring backend app settings"
az webapp config appsettings set -g "$AZ_RG" -n "$BACKEND_APPNAME" --settings \
  NODE_ENV=production PORT=3002 WEBSITES_PORT=3002 \
  DATABASE_URL="$DB_URL" \
  FRONTEND_URL="$FRONTEND_URL" CORS_ORIGINS="$FRONTEND_URL" \
  UPLOAD_VOLUME_PATH="/app/uploads" UPLOAD_DIR="/app/uploads" MAX_FILE_SIZE="10485760" >/dev/null

echo "Mounting Azure Files to /app/uploads"
az webapp config storage-account add -g "$AZ_RG" -n "$BACKEND_APPNAME" \
  --custom-id uploads --storage-type AzureFiles \
  --account-name "$STORAGE_NAME" --share-name uploads \
  --access-key "$STORAGE_KEY" --mount-path /app/uploads >/dev/null || true

echo "Creating Frontend Web App $FRONTEND_APPNAME"
az webapp create -g "$AZ_RG" -p "$PLAN_NAME" -n "$FRONTEND_APPNAME" --deployment-container-image-name "$ACR_LOGIN_SERVER/inchronicle-frontend:latest" >/dev/null || true
FRONTEND_MI=$(az webapp identity assign -g "$AZ_RG" -n "$FRONTEND_APPNAME" --query principalId -o tsv)
az role assignment create --assignee "$FRONTEND_MI" --scope "$ACR_ID" --role "AcrPull" >/dev/null || true
az webapp config appsettings set -g "$AZ_RG" -n "$FRONTEND_APPNAME" --settings PORT=4173 WEBSITES_PORT=4173 >/dev/null

echo "Done. Next: push images via ACR build (use GitHub Actions or local az acr build)."


