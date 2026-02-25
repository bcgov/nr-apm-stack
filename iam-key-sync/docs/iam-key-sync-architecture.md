# Architecture and script flow

This document describes the architecture and script flow of the IAM key sync service. It follows the same base pattern as [nr-broker-knox-cronjob](https://github.com/bcgov/nr-broker-knox-cronjob) — see [its architecture doc](https://github.com/bcgov/nr-broker-knox-cronjob/blob/main/docs/nr-broker-knox-cronjob.md) for a detailed explanation of the shared scripts.

## Container startup

The `workflow-cli/Dockerfile` (built from the repo root) uses `node:lts-alpine`, installs `curl`, `bash`, and `jq`, builds the workflow-cli, and copies the iam-key-sync scripts. The entrypoint is:

```sh
./mask-runner.sh ./iam-key-sync-cron.sh
```

Two environment variables are pre-set in the image:

- `GITHUB_ENV=/tmp/ENV` — a file used to pass state between scripts
- `GITHUB_OUTPUT=/tmp/OUT` — captures job outputs (e.g. the audit URL)

`src/ENV` seeds the env file with `INTENTION_PATH=/app/iam-key-sync-intention.json` before the cron runs.

---

## iam-key-sync-cron.sh — the orchestrator

Mirrors `backup-cron.sh` from nr-broker-knox-cronjob. Calls the shared scripts in sequence, passing state through `$GITHUB_ENV`. The action token is named `ACTION_TOKEN_SYNC` (derived from the `"id": "sync"` field in the intention):

```sh
env $(cat $GITHUB_ENV | xargs) ./intention-open.sh
source $GITHUB_ENV
env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./action-start.sh
env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./vault-login.sh

env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./iam-key-sync-runner.sh

env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC OUTCOME=success ./action-end.sh
env $(cat $GITHUB_ENV | xargs) ./vault-token-revoke.sh
env $(cat $GITHUB_ENV | xargs) OUTCOME=success ./intention-close.sh
```

---

## Intention — iam-key-sync-intention.json

Declares a single action with `"id": "sync"` and `"provision": ["token/self"]`, targeting the `nr-apm-stack` service:

```json
{
  "event": {
    "provider": "nr-apm-stack-iam-key-sync",
    "reason": "Job triggered",
    "transient": true
  },
  "actions": [
    {
      "action": "provision",
      "id": "sync",
      "provision": ["token/self"],
      "service": {
        "name": "nr-apm-stack",
        "project": "nr-apm-stack",
        "environment": "production"
      }
    }
  ],
  "user": {
    "name": "iam-key-sync@internal"
  }
}
```

`"transient": true` means the intention is not permanently recorded in the Broker graph — it only creates an audit trail.

---

## Shared scripts (unchanged from nr-broker-knox-cronjob)

| Script | Purpose |
|---|---|
| `mask-runner.sh` | Wraps all output; redacts values marked with `::add-mask::` |
| `intention-open.sh` | Opens the intention with Broker; writes `INTENTION_TOKEN` and `ACTION_TOKEN_SYNC` to `$GITHUB_ENV` |
| `action-start.sh` | Tells Broker the sync action has begun |
| `vault-login.sh` | Exchanges `ACTION_TOKEN_SYNC` for a short-lived, wrapped `VAULT_TOKEN` via Broker → Vault |
| `action-end.sh` | Tells Broker the sync action succeeded |
| `vault-token-revoke.sh` | Immediately revokes `VAULT_TOKEN` in Vault |
| `intention-close.sh` | Finalises the audit trail in Broker |

---

## iam-key-sync-runner.sh — the sync step

This is the only script specific to the IAM sync operation. It receives `VAULT_TOKEN` (provisioned by `vault-login.sh` via `$GITHUB_ENV`) and invokes the `iam-key-rotation` command from the `workflow-cli`:

```sh
cd /workflow-cli && ./bin/dev iam-key-rotation
```

`VAULT_TOKEN` and `TARGET_ENV` are available as environment variables. The workflow-cli uses `VAULT_TOKEN` to authenticate with Vault and perform the key rotation.

---

## Overall flow

```
Container starts
    └── mask-runner.sh wraps all output
        └── iam-key-sync-cron.sh orchestrates:
            1. intention-open     → get INTENTION_TOKEN + ACTION_TOKEN_SYNC from Broker
            2. action-start       → tell Broker the sync action began
            3. vault-login        → exchange ACTION_TOKEN_SYNC for VAULT_TOKEN via Broker → Vault
            4. iam-key-sync-runner→ cd /workflow-cli && ./bin/dev iam-key-rotation (VAULT_TOKEN in env)
            5. action-end         → tell Broker the sync action succeeded
            6. vault-token-revoke → revoke VAULT_TOKEN in Vault
            7. intention-close    → finalise audit trail in Broker
```
