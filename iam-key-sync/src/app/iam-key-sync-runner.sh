#!/usr/bin/env bash

echo "===> IAM key sync start"

# VAULT_TOKEN is set by vault-login.sh via GITHUB_ENV
# TARGET_ENV is the environment to sync keys for

# Fetch KV secrets from Vault and export as environment variables
echo "Fetching secrets from $KV_PATH"
KV_JSON=$(curl -s --fail \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  "$VAULT_ADDR/v1/$KV_PATH")

if [ $? -ne 0 ] || [ -z "$KV_JSON" ]; then
  echo "Error: Failed to fetch KV data from $KV_PATH"
  exit 1
fi

# Export each key=value pair from the KV data
eval "$(echo "$KV_JSON" | jq -r '.data.data | to_entries[] | "export \(.key)=\(.value | @sh)"')"

cd /workflow-cli && ./bin/dev iam-key-rotation
code=$?

if [ "$code" != "0" ]; then
    echo "Exit: iam-key-rotation failed ($code)"
    exit 1
fi

echo "Success"
