#!/usr/bin/env bash

echo "===> IAM key sync start"

# VAULT_TOKEN is set by vault-login.sh via GITHUB_ENV
# SYNC_URL is the nr-apm-stack IAM sync endpoint
# TARGET_ENV is the environment to sync keys for

RESPONSE=$(curl -s -X POST "$SYNC_URL" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"environment\":\"$TARGET_ENV\"}")
code=$?

if [ "$code" != "0" ]; then
    echo "Exit: curl error ($code)"
    echo "$RESPONSE"
    exit 1
fi

if [ "$(echo $RESPONSE | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    echo $RESPONSE | jq '.'
    exit 1
fi

echo "Sync response:"
echo "$RESPONSE" | jq '.'

echo "Success"
