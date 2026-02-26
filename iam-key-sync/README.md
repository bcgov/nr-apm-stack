# IAM Key Sync Service

This service performs IAM key synchronization for the NR APM Stack. It follows the same pattern as [nr-broker-knox-cronjob](https://github.com/bcgov-nr/nr-broker-knox-cronjob): it opens an NR Broker intention, provisions a Vault token, passes that token to the nr-apm-stack IAM sync endpoint, then closes the intention.

## Documentation

- [Architecture and script flow](docs/iam-key-sync-architecture.md) — detailed walkthrough of the intention lifecycle, Vault token provisioning, and script orchestration

## Overview

- Runs as a containerized cronjob (OpenShift or locally)
- Opens an NR Broker intention and provisions a scoped Vault token
- Calls the nr-apm-stack IAM sync endpoint with the Vault token
- Revokes the Vault token and closes the intention on completion

## Directory structure

```
iam-key-sync/
├── setenv-tmpl.sh              # Environment variable template (copy and fill in locally)
└── src/
    ├── ENV                     # Sets INTENTION_PATH for the container
    └── app/
        ├── mask-runner.sh          # Masks secrets in output
        ├── iam-key-sync-cron.sh    # Orchestrator (entrypoint)
        ├── iam-key-sync-runner.sh  # Calls the nr-apm-stack sync endpoint
        ├── iam-key-sync-intention.json
        ├── intention-open.sh
        ├── intention-close.sh
        ├── action-start.sh
        ├── action-end.sh
        ├── vault-login.sh
        └── vault-token-revoke.sh
```

## Running locally

1. Copy the env template and fill in values:
   ```sh
   cp setenv-tmpl.sh setenv.sh
   # edit setenv.sh
   ```

2. Build the image using the workflow-cli Dockerfile (from the **repo root**):
   ```sh
   docker build -f workflow-cli/Dockerfile -t iam-key-sync .
   ```

3. Run the container:
   ```sh
   source setenv.sh
   docker run --rm \
     -e BROKER_JWT="$BROKER_JWT" \
     -e BROKER_URL="$BROKER_URL" \
     -e VAULT_URL="$VAULT_URL" \
     -e TARGET_ENV="$TARGET_ENV" \
     iam-key-sync
   ```

## Deploying to OpenShift

Deployment is managed via the GitOps repo. See the `iam-key-sync/` directory in the tenant GitOps repository for the Helm chart and CronJob manifest.

The secret `iam-key-sync-prod` must exist in the target namespace with the key `BROKER_JWT` before deploying.

## Configuration

| Variable    | Description                                              | Source    |
|-------------|----------------------------------------------------------|-----------|
| BROKER_JWT  | JWT for authenticating with NR Broker                    | Secret    |
| BROKER_URL  | NR Broker base URL                                       | Secret    |
| VAULT_URL   | HashiCorp Vault base URL                                 | Secret    |
| TARGET_ENV  | Target environment name (e.g. `production`)              | ConfigMap |

## License

See LICENSE in repo root.
