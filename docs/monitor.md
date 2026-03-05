# Create a Monitor for Application/Service

Infrastructure is deployed using AWS SAM. The CloudFormation template is defined in [template.yaml.tpl](https://github.com/bcgov/nr-apm-stack/blob/main/template.yaml.tpl) and rendered to `template.yaml` using the workflow-cli `aws-render` command. Monitors and notification channels are managed as configuration files in the workflow-cli and synced to OpenSearch using the `opensearch-sync` command.

## Add a new AWS SNS Topic

1. Add a notification channel configuration file in [workflow-cli/configuration-opensearch/notification/](https://github.com/bcgov/nr-apm-stack/tree/main/workflow-cli/configuration-opensearch/notification)
2. Create a PR for [nr-apm-stack](https://github.com/bcgov/nr-apm-stack) and deploy via GitHub Actions
3. If OpenSearch needs to publish to the topic, verify the topic ARN is included in the `OpenSearchSnsRole` policy in [template.yaml.tpl](https://github.com/bcgov/nr-apm-stack/blob/main/template.yaml.tpl)

SNS notification channel files use the naming convention `<name>.sns.json`:

```json
{
  "id": "<name>-sns",
  "entity": "SnsResourceName",
  "name": "Display Name",
  "description": "SNS destination (APM Deployment Managed)",
  "configType": "sns",
  "isEnabled": true,
  "sns": {
    "topicArn": "apm-prod-<topic-suffix>",
    "roleArn": "opensearch_sns_apm-prod"
  }
}
```

Microsoft Teams webhook channels use `<name>.microsoft_teams.json`:

```json
{
  "id": "<name>-msteams",
  "name": "Display Name",
  "description": "MS Teams channel (APM Deployment Managed)",
  "configType": "microsoft_teams",
  "isEnabled": true,
  "microsoft_teams": {
    "url": "<%= url %>"
  }
}
```

After running `opensearch-sync`, the notification channels will appear in OpenSearch -> Notification -> Channels.

## Create a Monitor with the Workflow CLI

Monitor templates are stored in [workflow-cli/configuration-opensearch/alerting/](https://github.com/bcgov/nr-apm-stack/tree/main/workflow-cli/configuration-opensearch/alerting). Each monitor has two files:

- `<name>.config.json` — Controls how the monitor is generated
- `<name>.monitor.json` — The OpenSearch monitor definition template (EJS)

### Config Types

The `config.json` file determines the scope of monitor generation:

| Type      | Description                                                          | Example                                                               |
|-----------|----------------------------------------------------------------------|-----------------------------------------------------------------------|
| `agent`   | Generates a monitor per Fluent Bit agent instance (from Broker API)  | `{"type": "agent"}`                                                   |
| `server`  | Generates a monitor per server (from Broker API)                     | `{"type": "server"}`                                                  |
| `service` | Generates a monitor per environment for a specific service           | `{"type": "service", "serviceId": "...", "environments": ["test", "production"]}` |

The Broker API provides the server and agent inventory used during rendering. Monitor IDs and trigger/action IDs are deterministically generated from SHA256 hashes. Monitors are prefixed with `nrids_` in OpenSearch.

### Monitor Template Fields

The `.monitor.json` file is an OpenSearch monitor definition using EJS templates. Key fields:

| Field Name    | Description                                     | Example                                                     |
|---------------|-------------------------------------------------|-------------------------------------------------------------|
| name          | Monitor name (unique, uses EJS template vars)    | `nrids_agent_fluentbit_<%= server.name %>_<%= agent.index %>`|
| monitor_type  | OpenSearch monitor type                          | `query_level_monitor`                                        |
| schedule      | Monitoring interval                              | `{"period": {"interval": 1, "unit": "MINUTES"}}`            |
| inputs        | OpenSearch DSL query                             | Search query with index, filters, and aggregations           |
| triggers      | Conditions and actions when triggered            | Threshold conditions with notification actions               |

### Syncing Monitors

Use the workflow-cli to sync monitors to OpenSearch:

```bash
# Sync all configuration (templates, policies, notifications, monitors)
./bin/run opensearch-sync

# Sync only monitors
./bin/run opensearch-sync-monitors

# Dry run to preview changes without applying
./bin/run opensearch-sync-monitors --dryRun
```

The sync compares rendered monitors with existing ones in OpenSearch and will create, update, or remove monitors as needed. Orphaned monitors (prefixed with `nrids_` but not in the current configuration) are automatically removed.

## Create a Monitor with OpenSearch UI - Manual Steps

- Login OpenSearch
- Main Menu -> Alerting -> Monitors -> **Create monitor**
![Create monitor](./images/createmonitor.jpg)

![Monitor Settings](./images/monitorsettings.jpg)

<em>Currently, we only use two defined method to create a monitor: **Visual Editor** and **Extraction query editor**</em>

**Example for Setup a Monitor with Visual Editor:**

![Visual Monitor setup-1](./images/visualmonitorsetting.jpg)

![Visual Monitor setup-2](./images/visualmonitorsetting-2.jpg)

**Example for Setup a Monitor with Extraction Query Editor:**

![Query Monitor setup-1](./images/querymonitorsettings.jpg)

![Query Monitor setup-2](./images/querymonitorsettings-2.jpg)

- Trigger: Setup Trigger name and Trigger condition

<em>Example showed on above images</em>

- Action: Setup Action name, channel, and message

<em>Example showed on above images</em>
