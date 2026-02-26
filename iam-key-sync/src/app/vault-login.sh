#!/usr/bin/env bash

echo "===> Vault login"
# Get wrapped id
if [[ -z "${PROVISION_ROLE_ID}" ]]; then
  WRAPPED_VAULT_TOKEN_JSON=$(curl -s -X POST $BROKER_URL/v1/provision/token/self \
    -H 'X-Broker-Token: '"$ACTION_TOKEN"'' \
    -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'' \
  )
else
  WRAPPED_VAULT_TOKEN_JSON=$(curl -s -X POST $BROKER_URL/v1/provision/token/self \
    -H 'X-Broker-Token: '"$ACTION_TOKEN"'' \
  )
fi

if [ "$(echo $WRAPPED_VAULT_TOKEN_JSON | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    echo $WRAPPED_VAULT_TOKEN_JSON | jq '.'
    exit 1
fi
WRAPPED_VAULT_TOKEN=$(echo $WRAPPED_VAULT_TOKEN_JSON | jq -r '.wrap_info.token')
echo "::add-mask::$WRAPPED_VAULT_TOKEN"

if [ "$WRAP_TOKEN" = true ]; then
    echo "VAULT_TOKEN=$WRAPPED_VAULT_TOKEN" >> $GITHUB_ENV
else
    echo "===> Unwrap token"
    VAULT_TOKEN_JSON=$(curl -s -X POST $VAULT_URL/v1/sys/wrapping/unwrap -H 'X-Vault-Token: '"$WRAPPED_VAULT_TOKEN"'')
    VAULT_TOKEN=$(echo -n $VAULT_TOKEN_JSON | jq -r '.auth.client_token')
    echo "::add-mask::$VAULT_TOKEN"
    echo "VAULT_TOKEN=$VAULT_TOKEN" >> $GITHUB_ENV
fi

echo "Success"
