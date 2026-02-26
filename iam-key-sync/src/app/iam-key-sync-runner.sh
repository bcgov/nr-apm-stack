#!/usr/bin/env bash

echo "===> IAM key sync start"

# VAULT_TOKEN is set by vault-login.sh via GITHUB_ENV
# TARGET_ENV is the environment to sync keys for

cd /workflow-cli && ./bin/dev iam-key-rotation
code=$?

if [ "$code" != "0" ]; then
    echo "Exit: iam-key-rotation failed ($code)"
    exit 1
fi

echo "Success"
