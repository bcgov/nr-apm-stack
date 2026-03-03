#!/usr/bin/env bash

echo "===> Intention open"

# cat $INTENTION_PATH

INTEGER_TEST='^[0-9]+$'
URL_PARAMS=""
if [ "$QUICKSTART" = true ]; then
  URL_PARAMS="?quickstart=true"
fi

if [[ $TTL =~ $INTEGER_TEST ]]; then
  if [ "$QUICKSTART" = true ]; then
    URL_PARAMS="$URL_PARAMS&ttl=$TTL"
  else
    URL_PARAMS="?ttl=$TTL"
  fi
fi

echo "Post: $BROKER_URL/v1/intention/open$URL_PARAMS"
# Use saved intention token to close intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open$URL_PARAMS \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer '"$BROKER_JWT"'' \
    -d @$INTENTION_PATH \
    )

if [ "$(echo $RESPONSE | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    echo $RESPONSE | jq '.'
    exit 1
fi

echo "===> Save intention token and intention ID to env"
# Save intention token for later
INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "::add-mask::$INTENTION_TOKEN"
echo "INTENTION_TOKEN=$INTENTION_TOKEN" >> $GITHUB_ENV
echo "INTENTION_ID=$(echo ${RESPONSE} | jq -r '.id')" >> $GITHUB_ENV

echo "===> Save action tokens to env"
# Save action tokens for later
# Wrap in () to make output from jq into a bash array
ACTION_IDS=($(echo $RESPONSE | jq -r '.actions | keys[]'))
for ID in "${ACTION_IDS[@]}"
do
  TOKEN=$(echo $RESPONSE | jq -r '.actions.'"$ID"'.token')
  TRACE=$(echo $RESPONSE | jq -r '.actions.'"$ID"'.trace_id')
  ID_ENV='ACTION_TOKEN_'"$(echo -n $ID | tr '[:lower:]' '[:upper:]')"''
  echo ''"$ID_ENV"' (id: '"$ID"', trace: '"$TRACE"')'
  echo "::add-mask::$TOKEN"
  echo ''"$ID_ENV"'='"$TOKEN"'' >> $GITHUB_ENV
done

echo "Success"
