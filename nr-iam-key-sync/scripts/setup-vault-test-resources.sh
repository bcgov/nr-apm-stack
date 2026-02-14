#!/usr/bin/env bash
#
# Create Vault test resources for local integration testing
# - Write-only policy for IAM key sync
# - Test token with the policy
# - Upload token to S3 for enhanced mode
#

set -e

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_MOUNT="${VAULT_MOUNT:-secret}"
VAULT_PATH_PREFIX="${VAULT_PATH_PREFIX:-aws/iam-keys}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-}"

echo "=== Setting up Vault Test Resources ==="
echo "Vault Address: $VAULT_ADDR"
echo "Vault Mount: $VAULT_MOUNT"
echo "Path Prefix: $VAULT_PATH_PREFIX"
echo

# Check Vault connectivity
if ! vault status > /dev/null 2>&1; then
    echo "❌ Cannot connect to Vault at $VAULT_ADDR"
    echo "   Make sure VAULT_ADDR and VAULT_TOKEN are set"
    exit 1
fi

# Enable KV v2 engine (if not already enabled)
echo "Checking if KV v2 engine is enabled at $VAULT_MOUNT..."
if vault secrets list -format=json | jq -e ".[\"${VAULT_MOUNT}/\"]" > /dev/null 2>&1; then
    echo "✅ KV engine already enabled at $VAULT_MOUNT"
else
    echo "Enabling KV v2 engine at $VAULT_MOUNT..."
    vault secrets enable -version=2 -path="$VAULT_MOUNT" kv
    echo "✅ KV v2 engine enabled"
fi

# Create write-only policy
echo
echo "Creating write-only policy for IAM key sync..."
vault policy write iam-key-sync-policy - <<EOF
# Write-only access to IAM key paths
path "${VAULT_MOUNT}/data/${VAULT_PATH_PREFIX}/*" {
  capabilities = ["create", "update"]
}

# Required for KV v2 metadata operations
path "${VAULT_MOUNT}/metadata/${VAULT_PATH_PREFIX}/*" {
  capabilities = ["list", "read"]
}
EOF
echo "✅ Policy created: iam-key-sync-policy"

# Create token for basic mode (short-lived)
echo
echo "Creating token for basic mode testing (1h TTL)..."
BASIC_TOKEN=$(vault token create \
    -policy=iam-key-sync-policy \
    -ttl=1h \
    -format=json | jq -r '.auth.client_token')
echo "✅ Basic token created"
echo "   VAULT_TOKEN=$BASIC_TOKEN"

# Create token for enhanced mode (long-lived, renewable)
echo
echo "Creating token for enhanced mode testing (720h TTL, renewable)..."
ENHANCED_TOKEN=$(vault token create \
    -policy=iam-key-sync-policy \
    -ttl=720h \
    -renewable=true \
    -format=json | jq -r '.auth.client_token')
echo "✅ Enhanced token created"

# Upload enhanced token to S3 if bucket is specified
if [ -n "$S3_BUCKET_NAME" ]; then
    echo
    echo "Uploading enhanced token to S3..."
    echo "{\"token\": \"${ENHANCED_TOKEN}\"}" | \
        aws s3 cp - "s3://${S3_BUCKET_NAME}/vault-token.json" \
        --server-side-encryption AES256
    echo "✅ Token uploaded to s3://${S3_BUCKET_NAME}/vault-token.json"
else
    echo
    echo "⚠️  S3_BUCKET_NAME not set - skipping token upload to S3"
    echo "   For enhanced mode testing, manually upload token:"
    echo "   echo '{\"token\": \"${ENHANCED_TOKEN}\"}' | aws s3 cp - s3://YOUR_BUCKET/vault-token.json"
fi

# Verify write-only access
echo
echo "Verifying write-only access (this should fail)..."
if VAULT_TOKEN="$BASIC_TOKEN" vault kv get "${VAULT_MOUNT}/${VAULT_PATH_PREFIX}/test" 2>/dev/null; then
    echo "❌ Token has read access - this is incorrect!"
    exit 1
else
    echo "✅ Token correctly lacks read access (permission denied as expected)"
fi

echo
echo "=== Setup Complete ==="
echo
echo "Update your .env file with:"
echo "  VAULT_TOKEN=$BASIC_TOKEN"
echo
echo "Tokens created:"
echo "  Basic mode (1h):  $BASIC_TOKEN"
echo "  Enhanced mode:    $ENHANCED_TOKEN (uploaded to S3)"
echo
echo "Next steps:"
echo "  1. Copy .env.example to .env and update values"
echo "  2. Run: npm run build"
echo "  3. Run: npx ts-node scripts/test-basic-local.ts"
echo "  4. Run: npx ts-node scripts/test-enhanced-local.ts"
