workflow-cli
=================

AWS Deployment Workflow CLI handles the configuration of the OpenSearch product. It also has a support command for downloading GeoIP assets for the SAM deployment.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

## Running locally

The easiest way to run it locally is to setup your environment variables using one of the [provided templates](./local/).

Some of the commands support a `--dryRun` option.

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g workflow-cli
$ workflow-cli COMMAND
running command...
$ workflow-cli (--version)
workflow-cli/1.0.0 darwin-arm64 node-v24.13.0
$ workflow-cli --help [COMMAND]
USAGE
  $ workflow-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`workflow-cli automation-message`](#workflow-cli-automation-message)
* [`workflow-cli aws-render [FILE]`](#workflow-cli-aws-render-file)
* [`workflow-cli lambda-asset-download [FILE]`](#workflow-cli-lambda-asset-download-file)
* [`workflow-cli opensearch-index-usage ACTION`](#workflow-cli-opensearch-index-usage-action)
* [`workflow-cli opensearch-sync`](#workflow-cli-opensearch-sync)
* [`workflow-cli opensearch-sync-monitors`](#workflow-cli-opensearch-sync-monitors)
* [`workflow-cli reindex`](#workflow-cli-reindex)
* [`workflow-cli snapshot ACTION`](#workflow-cli-snapshot-action)

## `workflow-cli automation-message`

Automation message receive tool

```
USAGE
  $ workflow-cli automation-message -u <value> -d <value> --region <value> --accessId <value> --accessKey <value>
    --accountNumber <value> [--arn <value>] [--dryRun] [--maxBatches <value>]

FLAGS
  -d, --domainName=<value>     (required) [env: OS_DOMAIN] OpenSearch Domain
  -u, --hostname=<value>       (required) [env: OS_URL] OpenSearch url
      --accessId=<value>       (required) [env: AWS_ACCESS_KEY_ID] AWS access key id
      --accessKey=<value>      (required) [env: AWS_SECRET_ACCESS_KEY] AWS secret access key
      --accountNumber=<value>  (required) [env: AWS_ACCOUNT_NUMBER] AWS account number
      --arn=<value>            [env: AWS_ASSUME_ROLE] AWS ARN
      --dryRun                 [env: DRY_RUN] Enables dry run
      --maxBatches=<value>     [default: 10, env: AWS_SQS_MAX_BATCH_COUNT] Number of times to request batch of messages
      --region=<value>         (required) [env: AWS_REGION] AWS region

DESCRIPTION
  Automation message receive tool

EXAMPLES
  $ workflow-cli automation-message
```

## `workflow-cli aws-render [FILE]`

Renders AWS Cloudformation doc

```
USAGE
  $ workflow-cli aws-render [FILE]

DESCRIPTION
  Renders AWS Cloudformation doc

EXAMPLES
  $ workflow-cli aws-render
```

## `workflow-cli lambda-asset-download [FILE]`

Download assets used by the lambda to process data

```
USAGE
  $ workflow-cli lambda-asset-download [FILE] -l <value>

FLAGS
  -l, --license=<value>  (required) [env: MAXMIND_LICENSE_KEY] MaxMind License

DESCRIPTION
  Download assets used by the lambda to process data

EXAMPLES
  $ workflow-cli lambda-asset-download
```

## `workflow-cli opensearch-index-usage ACTION`

Index usage generator tool

```
USAGE
  $ workflow-cli opensearch-index-usage ACTION -u <value> -d <value> --region <value> --accessId <value> --accessKey <value>
    --accountNumber <value> --indicesname <value> --fieldname <value> [--arn <value>]

ARGUMENTS
  ACTION  [default: _search] Search indices usage

FLAGS
  -d, --domainName=<value>     (required) [env: OS_DOMAIN] OpenSearch Domain
  -u, --hostname=<value>       (required) [env: OS_URL] OpenSearch url
      --accessId=<value>       (required) [env: AWS_ACCESS_KEY_ID] AWS access key id
      --accessKey=<value>      (required) [env: AWS_SECRET_ACCESS_KEY] AWS secret access key
      --accountNumber=<value>  (required) [env: AWS_ACCOUNT_NUMBER] AWS account number
      --arn=<value>            [env: AWS_ASSUME_ROLE] AWS ARN
      --fieldname=<value>      (required) [default: organization.id, env: OS_USAGE_FIELD] field name
      --indicesname=<value>    (required) [env: OS_USAGE_INDICES] indices name
      --region=<value>         (required) [env: AWS_REGION] AWS region

DESCRIPTION
  Index usage generator tool

EXAMPLES
  $ workflow-cli opensearch-index-usage
```

## `workflow-cli opensearch-sync`

Sync OpenSearch settings

```
USAGE
  $ workflow-cli opensearch-sync -u <value> -d <value> --region <value> --accessId <value> --accessKey <value>
    --accountNumber <value> --broker-token <value> [--arn <value>] [--broker-api-url <value>] [--vault-addr <value>]
    [--vault-token <value>] [-h]

FLAGS
  -d, --domainName=<value>      (required) [env: OS_DOMAIN] OpenSearch Domain
  -h, --help                    Show CLI help.
  -u, --hostname=<value>        (required) [env: OS_URL] OpenSearch url
      --accessId=<value>        (required) [env: AWS_ACCESS_KEY_ID] AWS access key id
      --accessKey=<value>       (required) [env: AWS_SECRET_ACCESS_KEY] AWS secret access key
      --accountNumber=<value>   (required) [env: AWS_ACCOUNT_NUMBER] AWS account number
      --arn=<value>             [env: AWS_ASSUME_ROLE] AWS ARN
      --broker-api-url=<value>  [default: https://broker.io.nrs.gov.bc.ca/, env: BROKER_API_URL] The broker api base url
      --broker-token=<value>    (required) [env: BROKER_TOKEN] The broker JWT
      --region=<value>          (required) [env: AWS_REGION] AWS region
      --vault-addr=<value>      [default: http://127.0.0.1:8200, env: VAULT_ADDR] The vault address
      --vault-token=<value>     [default: myroot, env: VAULT_TOKEN] The vault token

DESCRIPTION
  Sync OpenSearch settings

EXAMPLES
  $ workflow-cli opensearch-sync
```

## `workflow-cli opensearch-sync-monitors`

Sync OpenSearch settings

```
USAGE
  $ workflow-cli opensearch-sync-monitors -u <value> -d <value> --region <value> --accessId <value> --accessKey <value>
    --accountNumber <value> --broker-token <value> [--arn <value>] [--broker-api-url <value>] [--vault-addr <value>]
    [--vault-token <value>] [-h] [--dryRun]

FLAGS
  -d, --domainName=<value>      (required) [env: OS_DOMAIN] OpenSearch Domain
  -h, --help                    Show CLI help.
  -u, --hostname=<value>        (required) [env: OS_URL] OpenSearch url
      --accessId=<value>        (required) [env: AWS_ACCESS_KEY_ID] AWS access key id
      --accessKey=<value>       (required) [env: AWS_SECRET_ACCESS_KEY] AWS secret access key
      --accountNumber=<value>   (required) [env: AWS_ACCOUNT_NUMBER] AWS account number
      --arn=<value>             [env: AWS_ASSUME_ROLE] AWS ARN
      --broker-api-url=<value>  [default: https://broker.io.nrs.gov.bc.ca/, env: BROKER_API_URL] The broker api base url
      --broker-token=<value>    (required) [env: BROKER_TOKEN] The broker JWT
      --dryRun                  [env: DRY_RUN] Enables dry run
      --region=<value>          (required) [env: AWS_REGION] AWS region
      --vault-addr=<value>      [default: http://127.0.0.1:8200, env: VAULT_ADDR] The vault address
      --vault-token=<value>     [default: myroot, env: VAULT_TOKEN] The vault token

DESCRIPTION
  Sync OpenSearch settings

EXAMPLES
  $ workflow-cli opensearch-sync-monitors
```

## `workflow-cli reindex`

Bulk reindex runner

```
USAGE
  $ workflow-cli reindex -u <value> -d <value> --region <value> --accessId <value> --accessKey <value> -c
    <value> [--arn <value>]

FLAGS
  -c, --config=<value>      (required) [env: REINDEX_CONFIG_NAME] The configuration file name (without .json)
  -d, --domainName=<value>  (required) [env: OS_DOMAIN] OpenSearch Domain
  -u, --hostname=<value>    (required) [env: OS_URL] OpenSearch url
      --accessId=<value>    (required) [env: AWS_ACCESS_KEY_ID] AWS access key id
      --accessKey=<value>   (required) [env: AWS_SECRET_ACCESS_KEY] AWS secret access key
      --arn=<value>         [env: AWS_ASSUME_ROLE] AWS ARN
      --region=<value>      (required) [env: AWS_REGION] AWS region

DESCRIPTION
  Bulk reindex runner

EXAMPLES
  $ workflow-cli reindex
```

## `workflow-cli snapshot ACTION`

Snapshot setup and creation tool

```
USAGE
  $ workflow-cli snapshot ACTION -u <value> -d <value> --region <value> --accessId <value> --accessKey <value>
    --accountNumber <value> [--arn <value>]

ARGUMENTS
  ACTION  (setup|create) [default: create] Snapshot action

FLAGS
  -d, --domainName=<value>     (required) [env: OS_DOMAIN] OpenSearch Domain
  -u, --hostname=<value>       (required) [env: OS_URL] OpenSearch url
      --accessId=<value>       (required) [env: AWS_ACCESS_KEY_ID] AWS access key id
      --accessKey=<value>      (required) [env: AWS_SECRET_ACCESS_KEY] AWS secret access key
      --accountNumber=<value>  (required) [env: AWS_ACCOUNT_NUMBER] AWS account number
      --arn=<value>            [env: AWS_ASSUME_ROLE] AWS ARN
      --region=<value>         (required) [env: AWS_REGION] AWS region

DESCRIPTION
  Snapshot setup and creation tool

EXAMPLES
  $ workflow-cli snapshot
```
<!-- commandsstop -->
