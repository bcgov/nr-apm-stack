# NR IAM Key Sync

Automated service to sync IAM user access keys from AWS SSM Parameter Store to HashiCorp Vault.

## Features

- **Two modes**: Basic sync or enhanced with state tracking
- **S3-backed state**: Tracks last sync time and secret hashes (enhanced mode)
- **Automatic Vault token management**: Fetches and refreshes tokens from S3 (enhanced mode)
- **Smart syncing**: Only syncs when secrets change (enhanced mode)
- **Once-daily sync**: Prevents redundant operations (enhanced mode)
- **AWS DirectConnect ready**: Secure private connection to Vault
- **Encrypted storage**: All S3 data encrypted at rest

## Quick Start

### Basic Mode

Simple, stateless syncing:

```typescript
import { createIamKeySyncService } from 'nr-iam-key-sync';

const service = createIamKeySyncService();

await service.syncKeyToVault(
    'john.doe',
    'secret',
    'aws/iam-keys/john.doe'
);
```

### Enhanced Mode

With S3 state tracking and automatic token management:

```typescript
import { createEnhancedIamKeySyncService } from 'nr-iam-key-sync';

const service = createEnhancedIamKeySyncService({
    s3BucketName: 'my-sync-state-bucket',
    vaultTokenS3Key: 'vault-token.json',
    syncStateS3Key: 'sync-state.json',
    vaultMount: 'secret',
    vaultPathPrefix: 'aws/iam-keys',
});

await service.initialize();
const result = await service.runSync(['john.doe', 'jane.smith']);
```

## Architecture

```
┌─────────────────┐
│   Lambda / EC2  │
│                 │
│  IAM Key Sync   │
│    Service      │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────┐  ┌──────────────┐
│  SSM Param  │  │  S3 Bucket   │
│   Store     │  │  (encrypted) │
│             │  │              │
│ /iam_users/ │  │ - Vault Token│
│ user_keys   │  │ - Sync State │
└─────────────┘  └──────────────┘
         │
         │  AWS DirectConnect
         │  (private network)
         ▼
┌─────────────────┐
│  Vault Server   │
│  (on-premises)  │
│                 │
│  secret/        │
│  aws/iam-keys/  │
└─────────────────┘
```

## When to Use Each Mode

### Basic Mode

Use when you:
- Need simple, on-demand syncing
- Manage state externally
- Don't need automatic token refresh
- Run sync manually or have custom scheduling

### Enhanced Mode

Use when you:
- Want once-daily automatic syncing
- Need Vault token auto-refresh
- Want to track access key changes
- Prefer S3-backed state management
- Deploy as scheduled Lambda function

## Installation

```bash
npm install nr-iam-key-sync
```

Or build from source:

```bash
git clone <repo-url>
cd nr-iam-key-sync
npm install
npm run build
```

## Prerequisites

1. **AWS Resources**:
   - SSM Parameter Store with IAM keys (`/iam_users/<user>_keys`)
   - S3 bucket for state (enhanced mode only)
   - VPC with DirectConnect (for private Vault access)

2. **Vault Setup**:
   - KV v2 secrets engine mounted (e.g., `secret/`)
   - Valid Vault token with write permissions

3. **IAM Permissions**:
   - `ssm:GetParameter` for IAM key parameters
   - `s3:GetObject`, `s3:PutObject` for state bucket (enhanced mode)

## SSM Parameter Format

Keys must be stored as:

**Path**: `/iam_users/<username>_keys`

**Value**:
```json
{
  "current": {
    "AccessKeyID": "AKIAIOSFODNN7EXAMPLE",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "pending_deletion": {
    "AccessKeyID": "AKIAI44QH8DHBEXAMPLE",
    "SecretAccessKey": "je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY"
  }
}
```

The service syncs the `current` key to Vault.

## AWS DirectConnect Setup

Configure Lambda or EC2 to use DirectConnect for Vault access:

1. **VPC Configuration**: Deploy in private subnets
2. **Route Tables**: Route Vault traffic (e.g., 10.0.0.0/8) via DirectConnect VIF
3. **Security Groups**: Allow outbound HTTPS (8200) to Vault
4. **No Internet**: Disable NAT gateway/internet gateway for Vault traffic

Example routing:

```
Destination         Target
0.0.0.0/0          local
10.0.0.0/8         vgw-xxxxx (DirectConnect)
```

## Environment Variables

### Basic Mode

```bash
VAULT_ADDR=https://vault.internal.example.com:8200
VAULT_TOKEN=hvs.CAESIxxxxx  # Optional if set programmatically
AWS_DEFAULT_REGION=ca-central-1
```

### Enhanced Mode

```bash
VAULT_ADDR=https://vault.internal.example.com:8200
AWS_DEFAULT_REGION=ca-central-1
# Vault token loaded from S3, not environment
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint
npm run lint

# Build
npm run build
```

## Testing

```bash
# Unit tests
npm test

# Coverage
npm run test:cov
```

## Security Considerations

1. **Vault Token Storage**: Never store tokens in code or environment variables in production. Use S3 with encryption.
2. **S3 Encryption**: Always enable AES-256 or KMS encryption for state bucket.
3. **Hash-Based State**: Sync state stores SHA-256 hashes of secrets, never actual credentials.
4. **Network Security**: Use DirectConnect for Vault traffic, never public internet.
5. **IAM Permissions**: Follow least privilege - only grant access to required SSM parameters and S3 paths.
6. **Audit Logging**: Enable CloudTrail and Vault audit logs.

## Background

This service integrates with the BC Gov IAM User management system documented at:
https://developer.gov.bc.ca/docs/default/component/public-cloud-techdocs/aws/LZA/design-build-deploy/iam-user-service/

IAM access keys are managed by the BC Gov platform and stored in SSM Parameter Store. This service provides a bridge to sync those keys into Vault for application consumption.

## License

Apache-2.0

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

