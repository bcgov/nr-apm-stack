#!/usr/bin/env sh


env $(cat $GITHUB_ENV | xargs) ./intention-open.sh
source $GITHUB_ENV
env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./action-start.sh
env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./vault-login.sh

env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC ./iam-key-sync-runner.sh

env $(cat $GITHUB_ENV | xargs) ACTION_TOKEN=$ACTION_TOKEN_SYNC OUTCOME=success ./action-end.sh
env $(cat $GITHUB_ENV | xargs) ./vault-token-revoke.sh
env $(cat $GITHUB_ENV | xargs) OUTCOME=success ./intention-close.sh

cat $GITHUB_OUTPUT
