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
workflow-cli/1.0.0 darwin-x64 node-v20.11.1
$ workflow-cli --help [COMMAND]
USAGE
  $ workflow-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`workflow-cli automation-message`](#workflow-cli-automation-message)
* [`workflow-cli help [COMMAND]`](#workflow-cli-help-command)
* [`workflow-cli lambda-asset-download [FILE]`](#workflow-cli-lambda-asset-download-file)
* [`workflow-cli opensearch-index-usage ACTION`](#workflow-cli-opensearch-index-usage-action)
* [`workflow-cli opensearch-sync`](#workflow-cli-opensearch-sync)
* [`workflow-cli opensearch-sync-monitors`](#workflow-cli-opensearch-sync-monitors)
* [`workflow-cli plugins`](#workflow-cli-plugins)
* [`workflow-cli plugins add PLUGIN`](#workflow-cli-plugins-add-plugin)
* [`workflow-cli plugins:inspect PLUGIN...`](#workflow-cli-pluginsinspect-plugin)
* [`workflow-cli plugins install PLUGIN`](#workflow-cli-plugins-install-plugin)
* [`workflow-cli plugins link PATH`](#workflow-cli-plugins-link-path)
* [`workflow-cli plugins remove [PLUGIN]`](#workflow-cli-plugins-remove-plugin)
* [`workflow-cli plugins reset`](#workflow-cli-plugins-reset)
* [`workflow-cli plugins uninstall [PLUGIN]`](#workflow-cli-plugins-uninstall-plugin)
* [`workflow-cli plugins unlink [PLUGIN]`](#workflow-cli-plugins-unlink-plugin)
* [`workflow-cli plugins update`](#workflow-cli-plugins-update)
* [`workflow-cli reindex`](#workflow-cli-reindex)
* [`workflow-cli snapshot ACTION`](#workflow-cli-snapshot-action)

## `workflow-cli automation-message`

Automation message receive tool

```
USAGE
  $ workflow-cli automation-message -u <value> -d <value> --region <value> --accessId <value> --accessKey <value>
    --accountNumber <value> [--arn <value>] [--dryRun] [--maxBatches <value>]

FLAGS
  -d, --domainName=<value>     (required) OpenSearch Domain
  -u, --hostname=<value>       (required) OpenSearch url
      --accessId=<value>       (required) AWS access key id
      --accessKey=<value>      (required) AWS secret access key
      --accountNumber=<value>  (required) AWS account number
      --arn=<value>            AWS ARN
      --dryRun                 Enables dry run
      --maxBatches=<value>     [default: 10] Number of times to request batch of messages
      --region=<value>         (required) AWS region

DESCRIPTION
  Automation message receive tool

EXAMPLES
  $ workflow-cli automation-message
```

## `workflow-cli help [COMMAND]`

Display help for workflow-cli.

```
USAGE
  $ workflow-cli help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for workflow-cli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.8/src/commands/help.ts)_

## `workflow-cli lambda-asset-download [FILE]`

Download assets used by the lambda to process data

```
USAGE
  $ workflow-cli lambda-asset-download [FILE] -l <value>

FLAGS
  -l, --license=<value>  (required) MaxMind License

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
  -d, --domainName=<value>     (required) OpenSearch Domain
  -u, --hostname=<value>       (required) OpenSearch url
      --accessId=<value>       (required) AWS access key id
      --accessKey=<value>      (required) AWS secret access key
      --accountNumber=<value>  (required) AWS account number
      --arn=<value>            AWS ARN
      --fieldname=<value>      (required) [default: organization.id] field name
      --indicesname=<value>    (required) indices name
      --region=<value>         (required) AWS region

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
  -d, --domainName=<value>      (required) OpenSearch Domain
  -h, --help                    Show CLI help.
  -u, --hostname=<value>        (required) OpenSearch url
      --accessId=<value>        (required) AWS access key id
      --accessKey=<value>       (required) AWS secret access key
      --accountNumber=<value>   (required) AWS account number
      --arn=<value>             AWS ARN
      --broker-api-url=<value>  [default: https://broker.io.nrs.gov.bc.ca/] The broker api base url
      --broker-token=<value>    (required) The broker JWT
      --region=<value>          (required) AWS region
      --vault-addr=<value>      [default: http://127.0.0.1:8200] The vault address
      --vault-token=<value>     [default: myroot] The vault token

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
  -d, --domainName=<value>      (required) OpenSearch Domain
  -h, --help                    Show CLI help.
  -u, --hostname=<value>        (required) OpenSearch url
      --accessId=<value>        (required) AWS access key id
      --accessKey=<value>       (required) AWS secret access key
      --accountNumber=<value>   (required) AWS account number
      --arn=<value>             AWS ARN
      --broker-api-url=<value>  [default: https://broker.io.nrs.gov.bc.ca/] The broker api base url
      --broker-token=<value>    (required) The broker JWT
      --dryRun                  Enables dry run
      --region=<value>          (required) AWS region
      --vault-addr=<value>      [default: http://127.0.0.1:8200] The vault address
      --vault-token=<value>     [default: myroot] The vault token

DESCRIPTION
  Sync OpenSearch settings

EXAMPLES
  $ workflow-cli opensearch-sync-monitors
```

## `workflow-cli plugins`

List installed plugins.

```
USAGE
  $ workflow-cli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ workflow-cli plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.4/src/commands/plugins/index.ts)_

## `workflow-cli plugins add PLUGIN`

Installs a plugin into workflow-cli.

```
USAGE
  $ workflow-cli plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into workflow-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the WORKFLOW_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the WORKFLOW_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ workflow-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ workflow-cli plugins add myplugin

  Install a plugin from a github url.

    $ workflow-cli plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ workflow-cli plugins add someuser/someplugin
```

## `workflow-cli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ workflow-cli plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ workflow-cli plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.4/src/commands/plugins/inspect.ts)_

## `workflow-cli plugins install PLUGIN`

Installs a plugin into workflow-cli.

```
USAGE
  $ workflow-cli plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into workflow-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the WORKFLOW_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the WORKFLOW_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ workflow-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ workflow-cli plugins install myplugin

  Install a plugin from a github url.

    $ workflow-cli plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ workflow-cli plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.4/src/commands/plugins/install.ts)_

## `workflow-cli plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ workflow-cli plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ workflow-cli plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.4/src/commands/plugins/link.ts)_

## `workflow-cli plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ workflow-cli plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ workflow-cli plugins unlink
  $ workflow-cli plugins remove

EXAMPLES
  $ workflow-cli plugins remove myplugin
```

## `workflow-cli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ workflow-cli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.4/src/commands/plugins/reset.ts)_

## `workflow-cli plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ workflow-cli plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ workflow-cli plugins unlink
  $ workflow-cli plugins remove

EXAMPLES
  $ workflow-cli plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.4/src/commands/plugins/uninstall.ts)_

## `workflow-cli plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ workflow-cli plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ workflow-cli plugins unlink
  $ workflow-cli plugins remove

EXAMPLES
  $ workflow-cli plugins unlink myplugin
```

## `workflow-cli plugins update`

Update installed plugins.

```
USAGE
  $ workflow-cli plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.4/src/commands/plugins/update.ts)_

## `workflow-cli reindex`

Bulk reindex runner

```
USAGE
  $ workflow-cli reindex -u <value> -d <value> --region <value> --accessId <value> --accessKey <value> -c
    <value> [--arn <value>]

FLAGS
  -c, --config=<value>      (required) The configuration file name (without .json)
  -d, --domainName=<value>  (required) OpenSearch Domain
  -u, --hostname=<value>    (required) OpenSearch url
      --accessId=<value>    (required) AWS access key id
      --accessKey=<value>   (required) AWS secret access key
      --arn=<value>         AWS ARN
      --region=<value>      (required) AWS region

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
  -d, --domainName=<value>     (required) OpenSearch Domain
  -u, --hostname=<value>       (required) OpenSearch url
      --accessId=<value>       (required) AWS access key id
      --accessKey=<value>      (required) AWS secret access key
      --accountNumber=<value>  (required) AWS account number
      --arn=<value>            AWS ARN
      --region=<value>         (required) AWS region

DESCRIPTION
  Snapshot setup and creation tool

EXAMPLES
  $ workflow-cli snapshot
```
<!-- commandsstop -->
