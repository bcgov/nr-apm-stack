#!/usr/bin/env bash
#
# Create AWS test resources for local integration testing
# - S3 bucket for state storage (encrypted, versioned)
#
# Note: SSM parameters are assumed to be created by other means
#

set -e

REGION="${AWS_DEFAULT_REGION:-ca-central-1}"
TEST_USER="${TEST_USER:-testuser}"
BUCKET_NAME="${S3_BUCKET_NAME:-nr-iam-key-sync-test-$(date +%s)}"

echo "=== Setting up AWS Test Resources ==="
echo "Region: $REGION"
echo "Test User: $TEST_USER"
echo "S3 Bucket: $BUCKET_NAME"
echo

# Create S3 bucket
echo "Creating S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Bucket already exists: $BUCKET_NAME"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    echo "✅ Bucket created: $BUCKET_NAME"
fi

# Enable encryption
echo "Enabling server-side encryption..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }'
echo "✅ Encryption enabled"

# Enable versioning
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled
echo "✅ Versioning enabled"

# Block public access
echo "Blocking public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
echo "✅ Public access blocked"

echo
echo "=== Setup Complete ==="
echo
echo "Update your .env file with:"
echo "  S3_BUCKET_NAME=$BUCKET_NAME"
echo "  TEST_USER=$TEST_USER"
echo
echo "Prerequisites:"
echo "  ⚠️  Ensure SSM parameter exists: /iam_users/${TEST_USER}_keys"
echo "     (Created by external IAM key rotation process)"
echo
echo "Next steps:"
echo "  1. Run scripts/setup-vault-test-resources.sh to create Vault resources"
echo "  2. Run scripts/test-basic-local.ts to test basic sync"
echo "  3. Run scripts/test-enhanced-local.ts to test enhanced sync"
