#!/usr/bin/env bash

echo "===> Action end"

# Use saved action token to end it
RESPONSE=$(curl -s -X POST -G $BROKER_URL/v1/intention/action/end --data-urlencode 'outcome='"$OUTCOME"'' -H 'X-Broker-Token: '"$ACTION_TOKEN"'')
code=$?

if [ "$code" != "0" ]; then
    echo "Exit: Error detected"
    echo $RESPONSE | jq '.'
    exit 1
fi

echo "Success"
