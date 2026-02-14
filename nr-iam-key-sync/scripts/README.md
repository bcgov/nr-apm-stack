# Local Integration Testing Scripts

Scripts for setting up and running local integration tests.

## Prerequisites

- **AWS CLI** configured with credentials
- **Vault instance** accessible (existing instance assumed)
- **SSM parameters** with IAM keys already created by external rotation process
- **Node.js 20+** installed

## Setup Workflow

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `VAULT_ADDR`: Your Vault server URL
- `AWS_DEFAULT_REGION`: AWS region (default: ca-central-1)
- `TEST_USER`: Test username (must have SSM parameter)

### 3. Set Up AWS Resources

Creates S3 bucket for state storage:

```bash
./scripts/setup-aws-test-resources.sh
```

This creates:
- S3 bucket (encrypted, versioned, public access blocked)

**Note**: SSM parameters must already exist at `/iam_users/<username>_keys`

### 4. Set Up Vault Resources

Creates Vault policy and tokens:

```bash
# Set S3_BUCKET_NAME from previous step
export S3_BUCKET_NAME=nr-iam-key-sync-test-1234567890

./scripts/setup-vault-test-resources.sh
```

This creates:
- Write-only Vault policy
- Basic mode token (1h TTL)
- Enhanced mode token (720h TTL, renewable)
- Uploads enhanced token to S3

### 5. Update .env File

Add the tokens output by the setup scripts:

```bash
VAULT_TOKEN=hvs.CAES...  # From setup-vault-test-resources.sh
S3_BUCKET_NAME=nr-iam-key-sync-test-1234567890  # From setup-aws-test-resources.sh
```

### 6. Build the Code

```bash
npm run build
```

## Running Tests

### Basic Mode Test

Tests simple SSM → Vault sync (no state tracking):

```bash
npx ts-node scripts/test-basic-local.ts
```

Expected behavior:
- Reads keys from SSM parameter `/iam_users/testuser_keys`
- Writes to Vault at `secret/aws/iam-keys/testuser`
- Logs sync result

### Enhanced Mode Test

Tests S3-backed state tracking and change detection:

```bash
npx ts-node scripts/test-enhanced-local.ts
```

Expected behavior:
- First run: Syncs keys, creates state in S3
- Second run: Skips sync (no changes, within 24h)
- State file contains hash, not actual credentials

## Verification

### Check S3 State

```bash
aws s3 cp s3://${S3_BUCKET_NAME}/sync-state.json - | jq .
```

Expected output (note the hash, not credentials):
```json
{
  "testuser": {
    "userName": "testuser",
    "lastSecretHash": "a1b2c3d4e5f6...",
    "lastSyncedAt": "2026-02-13T10:30:00.000Z"
  }
}
```

### Check Vault Secret

Requires a Vault token with read permissions (not the sync token):

```bash
vault kv get secret/aws/iam-keys/testuser
```

### Verify Write-Only Access

The sync token should NOT be able to read:

```bash
VAULT_TOKEN=<sync-token> vault kv get secret/aws/iam-keys/testuser
# Should fail with "permission denied"
```

## Cleanup

### Delete AWS Resources

```bash
# Delete S3 bucket contents
aws s3 rm s3://${S3_BUCKET_NAME} --recursive

# Delete bucket
aws s3api delete-bucket --bucket ${S3_BUCKET_NAME}
```

### Revoke Vault Tokens

```bash
vault token revoke <basic-token>
vault token revoke <enhanced-token>
```

## Troubleshooting

### "Parameter not found in SSM"

Ensure the SSM parameter exists:

```bash
aws ssm get-parameter --name /iam_users/testuser_keys --with-decryption
```

If missing, the parameter must be created by the external IAM key rotation process.

### "Cannot connect to Vault"

Check Vault connectivity:

```bash
vault status
```

Verify `VAULT_ADDR` and `VAULT_TOKEN` in `.env`.

### "S3 bucket does not exist"

Run `setup-aws-test-resources.sh` to create the bucket.

### "Permission denied" when writing to Vault

Verify the token has the correct policy:

```bash
vault token lookup
vault token capabilities secret/data/aws/iam-keys/testuser
# Should show: ["create", "update"]
```

## File Descriptions

- `setup-aws-test-resources.sh`: Creates S3 bucket for state storage
- `setup-vault-test-resources.sh`: Creates Vault policy and tokens
- `test-basic-local.ts`: Integration test for basic sync mode
- `test-enhanced-local.ts`: Integration test for enhanced sync with state
- `README.md`: This file
