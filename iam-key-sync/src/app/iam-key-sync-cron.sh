#!/usr/bin/env sh


env $(cat $GITHUB_ENV | xargs) ./intention-open.sh
if [ $? -ne 0 ]; then
  echo "Error: intention-open.sh failed"
  exit 1
fi

source $GITHUB_ENV
env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./action-start.sh
env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./vault-login.sh

env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./iam-key-sync-runner.sh

if [ $? -ne 0 ]; then
  echo "Error: iam-key-sync-runner.sh failed"
  env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC OUTCOME=failure ./action-end.sh
  env $(cat $GITHUB_ENV | xargs) ./vault-token-revoke.sh
  env $(cat $GITHUB_ENV | xargs) OUTCOME=failure ./intention-close.sh
  exit 1
fi

env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC OUTCOME=success ./action-end.sh
env $(cat $GITHUB_ENV | xargs) ./vault-token-revoke.sh
env $(cat $GITHUB_ENV | xargs) OUTCOME=success ./intention-close.sh

cat $GITHUB_OUTPUT
