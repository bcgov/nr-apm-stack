#!/usr/bin/env bash

echo "===> Intention close"

# Use saved intention token to close intention
RESPONSE=$(curl -s -X POST -G $BROKER_URL/v1/intention/close --data-urlencode 'outcome='"$OUTCOME"'' --data-urlencode 'reason='"$REASON"'' -H 'X-Broker-Token: '"$INTENTION_TOKEN"'')

if [ "$(echo $RESPONSE | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    echo $RESPONSE | jq '.'
    exit 1
fi

echo "audit-url=$(echo $RESPONSE | jq '.audit')" >> $GITHUB_OUTPUT

echo "Success"
