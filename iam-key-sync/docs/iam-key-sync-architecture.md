# Architecture and script flow

This document describes the architecture and script flow of the IAM key sync service. It follows the same base pattern as [nr-broker-knox-cronjob](https://github.com/bcgov/nr-broker-knox-cronjob) — see [its architecture doc](https://github.com/bcgov/nr-broker-knox-cronjob/blob/main/docs/nr-broker-knox-cronjob.md) for a detailed explanation of the shared scripts.

## Container startup

The `iam-key-sync/Dockerfile` (built from the repo root) uses `node:lts-alpine`, installs `curl`, `bash`, and `jq`, builds the workflow-cli, and copies the iam-key-sync scripts. The entrypoint is:

```sh
./mask-runner.sh ./iam-key-sync-cron.sh
```

Three environment variables are pre-set in the image:

- `GITHUB_ENV=/tmp/ENV` — a file used to pass state between scripts
- `GITHUB_OUTPUT=/tmp/OUT` — captures job outputs (e.g. the audit URL)
- `INTENTION_PATH=/app/iam-key-sync-intention.json` — path to the intention definition file

---

## iam-key-sync-cron.sh — the orchestrator

Mirrors `backup-cron.sh` from nr-broker-knox-cronjob. Calls the shared scripts in sequence, passing state through `$GITHUB_ENV`. The action token is named `ACTION_TOKEN_SYNC` (derived from the `"id": "sync"` field in the intention).

The script includes error handling:

- If `intention-open.sh` fails, the script exits immediately with an error.
- If `iam-key-sync-runner.sh` fails, the script closes the action and intention with `OUTCOME=failure` before exiting.

---

## Intention — iam-key-sync-intention.json

Declares a single action with `"id": "sync"` and `"provision": ["token/self"]`, targeting the `knox-iam-key-sync` service.

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

This is the only script specific to the IAM sync operation. It receives `VAULT_TOKEN` (provisioned by `vault-login.sh` via `$GITHUB_ENV`) and invokes the `iam-key-rotation` command from the `workflow-cli`. `VAULT_TOKEN` and `TARGET_ENV` are available as environment variables. The workflow-cli uses `VAULT_TOKEN` to authenticate with Vault and perform the key rotation.

---

## Overall flow

```
Container starts
    └── mask-runner.sh wraps all output
        └── iam-key-sync-cron.sh orchestrates:
            1. intention-open     → get INTENTION_TOKEN + ACTION_TOKEN_SYNC from Broker
               ✗ on failure → exit 1 immediately
            2. action-start       → tell Broker the sync action began
            3. vault-login        → exchange ACTION_TOKEN_SYNC for VAULT_TOKEN via Broker → Vault
            4. iam-key-sync-runner→ cd /workflow-cli && ./bin/dev iam-key-rotation (VAULT_TOKEN in env)
               ✗ on failure → action-end(failure) → vault-token-revoke → intention-close(failure) → exit 1
            5. action-end         → tell Broker the sync action succeeded
            6. vault-token-revoke → revoke VAULT_TOKEN in Vault
            7. intention-close    → finalise audit trail in Broker
```

---

## CI/CD

The container image is built and pushed to GitHub Packages (GHCR) by the `iam-key-sync-deploy.yml` workflow. It triggers on:

- Pushes to `main` that change files in `iam-key-sync/**` or `workflow-cli/**`
- Tags matching `v*`
- Manual `workflow_dispatch`

The image is published to `ghcr.io/<owner>/<repo>-iam-key-sync`.
