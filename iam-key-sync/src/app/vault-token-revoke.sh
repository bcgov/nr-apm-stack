#!/usr/bin/env bash

echo "===> Revoke token"

RESPONSE=$(curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    --request POST \
    $VAULT_URL/v1/auth/token/revoke-self)
code=$?

if [ "$code" != "0" ]; then
    echo "Exit: Error detected ($code)"
    echo $RESPONSE
    exit 1
fi

echo "Success"
