# OpenSearch Common Schema
"A common schema helps correlate data from sources like logs and metrics or IT operations analytics and security analytics".

Reference: [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html)

## Current User Cases
- Access Logs
- Audit Logs
    - NR Broker
    - Vault
    - Active MQ
- Application Logs
- CPU Metrics
- Deployment Metrics (Superseded by NR Broker Audit)
- Disk Usage Metrics
- Memory Usage Metrics
- Tomcat Access Logs
All these use cases have index naming patterns that must be adhered to. The naming pattern allows us to utilize [index templates](https://github.com/bcgov/nr-apm-stack/tree/main/workflow-cli/configuration-opensearch/index_template) to define the schema for the use case and policies to manage their lifecycle. All new use cases will start with the creation of a new index template and associated lifecycle.

## Style
- Lower case for static/constant values

## Field Reference

### Base Fields
| Field                    | Mandatory | Type    | Description                                                                                                                                                                                                                                                | Values |
|--------------------------|-----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| [@timestamp](https://www.elastic.co/guide/en/ecs/current/ecs-base.html#field-timestamp)               |     :bulb:     | date    | The date/time when the event/metric/alert took place                                                                                                                                                                                                       |        |
| message                  |     :bulb:     | keyword | Unstructured human readable text that provides details of the event. Things like the timestamp, error level and others should not appear here as it would duplicate those fields.                                                                          |        |
| labels.environment_alias |    :bulb:/#    | keyword | On traditional infrastructure, environments have been referred to in code and by developers by environment names specific to groups of applications. The lambda parser 'EnvironmentStandardizeParser' should be used to populate this field automatically. | wfint  |
| labels.project           |     :bulb:     | keyword | A business grouping of services (or components). This has been referred to as the application. Used in conjunction with the service. Related: service.name                                                                                                 |        |
| labels.target_project    |     :bulb:     | keyword | A business grouping of services (or components). Used in conjunction with the service.target. Related: service.target                                                                                                                                      |        |

Note on labels: Data is imported using index templates with strict turned on. So, the custom keys in labels (examples: environment_alias, project) must be defined in the index template. Labels will only be added in the unlikely case that ECS does not have a field for the data and the label adds unique value to the document.

Note on tags: These will likely not be used.

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-base.html](https://www.elastic.co/guide/en/ecs/current/ecs-base.html)

### Agent Fields
| Field         | Mandatory | Type    | Description | Values    |
|---------------|-----------|---------|-------------|-----------|
| agent.type    |     :bulb:     | keyword |             | fluentbit |
| agent.version |     :bulb:     | keyword |             | 1.7.4     |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-agent.html](https://www.elastic.co/guide/en/ecs/current/ecs-agent.html)

### Cloud Fields
| Field          | Mandatory | Type | Description | Values                       |
|----------------|-----------|------|-------------|------------------------------|
| cloud.provider |           |      |             | - bcgov - aws - azure        |
| cloud.region   |           |      |             | - bcgov - calgary - kamloops |

### Client Fields
Recommendation: Use [Source Fields](https://apps.nrs.gov.bc.ca/int/confluence/display/1TEAM/Common+Schema#CommonSchema-source-fields)

Client fields are for adding semantic context to an exchange. Generally, this is not necessary and/or a duplication.

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-client.html](https://www.elastic.co/guide/en/ecs/current/ecs-client.html)

### Destination Fields
| Field            | Mandatory | Type   | Description                                                                    | Values |
|------------------|-----------|--------|--------------------------------------------------------------------------------|--------|
| [destination.user](https://apps.nrs.gov.bc.ca/int/confluence/display/1TEAM/Common+Schema#CommonSchema-user-fields) |           | object | If the destination is associated a user, destination.user should be populated. |        |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-destination.html](https://www.elastic.co/guide/en/ecs/current/ecs-destination.html)

### ECS Fields
| Field       | Mandatory | Type    | Description              | Values |
|-------------|-----------|---------|--------------------------|--------|
| ecs.version |     :bulb:     | keyword | The ECS version (> 1.12) |        |

### Event Fields
| Field          | Mandatory | Type      | Description                                                                                                                                                                     | Values                                  |
|----------------|-----------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| [event.created](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-created)  |    :bulb:/#    | date      | See documentation. Must be present if not same as @timestamp                                                                                                                    |                                         |
| [event.category](https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-category.html) |     :bulb:     | keyword[] |                                                                                                                                                                                 | web                                     |
| [event.dataset](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-dataset)  |     :bulb:     | keyword[] |                                                                                                                                                                                 | apache.access edge.access tomcat.access |
| [event.ingested](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-ingested) |     :bulb:     |           | Timestamp when an event arrived in the central data store. This is automatically populated by Lambda before it is sent to ES. See: kinesis.parser.ts                            |                                         |
| [event.kind](https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-kind.html)     |     :bulb:     | keyword   |                                                                                                                                                                                 | event                                   |   |
| [event.type](https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-type.html)     |     :bulb:     | keyword[] |                                                                                                                                                                                 | access                                  |
| [event.original](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-original) |     :bulb:     | string    | Raw text message of entire event. This is hidden from display from unprivileged users. If there is no need to check data integrity, setting this is optional.                   |                                         |
| [event.outcome](https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-outcome.html)  |     :bulb:     | keyword   |                                                                                                                                                                                 | failure success unknown                 |
| [event.sequence](https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-sequence) |     :bulb:     | long      | Supplemental information (like the file byte offset from Fluent Bit) to determine ordering of closely occurring events. This may also be useful in investigating parsing issues. |                                         |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-event.html](https://www.elastic.co/guide/en/ecs/current/ecs-event.html)

### File Fields
Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-file.html](https://www.elastic.co/guide/en/ecs/current/ecs-file.html)

### Geo Fields
Applicable to groups that provides an IP address, such as source, destination, client and server

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-geo.html](https://www.elastic.co/guide/en/ecs/current/ecs-geo.html)

### Group Fields
Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-group.html](https://www.elastic.co/guide/en/ecs/current/ecs-group.html)

| Field        | Mandatory | Type    | Description                                                                                           | Values                                                                      |
|--------------|-----------|---------|-------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| group.domain |           | keyword | Name of the directory the group is a member of. For example, an LDAP or Active Directory domain name. |                                                                             |
| group.id     |           | keyword | Unique identifier for the group on the system/platform.                                               |                                                                             |
| group.name   |           | keyword | Name of the group.                                                                                    | appdelivery, dba, infraops, etc. Parsing from request.path with group/data/ |

### Host Fields
| Field                       | Mandatory | Type           | Description                                                                                                                                                               | Values |
|-----------------------------|-----------|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| [host.id](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-ip)                     |           |                | The primary FQDN of the server as returned by hostname -f                                                                                                                 |        |
| [host.hostname](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-hostname)               |           |                | The primary short server name as returned by hostname -s                                                                                                                  |        |
| [host.name](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-name)                   |           |                | List of all acceptable FQDN as returned by domainname -A                                                                                                                  |        |
| [host.domain](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-domain)                 |           |                | list of all assigned domain names extracted from host.name                                                                                                                |        |
| [host.ip](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-ip)                     |           |                | list of all assigned IP addressees                                                                                                                                        |        |
| [host.mac](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-mac)                    |           |                | list of all assigned MAC addresses                                                                                                                                        |        |
| host.network                |           | Network Fields | Network information (e.g.: vlan/zone) about the host                                                                                                                      |        |
| host.cpu.core_json          |           | keyword        | A JSON document with the usage state of every CPU core                                                                                                                    |        |
| host.cpu.user               |           | scaled_float   | The CPU dedicated to user processes                                                                                                                                       |        |
| host.cpu.system             |           | scaled_float   | The CPU dedicated to the system (OS)                                                                                                                                      |        |
| host.cpu.usage_core_max     |           | scaled_float   | The maximum usage value a CPU core                                                                                                                                        |        |
| host.cpu.usage_core_median  |           | scaled_float   | The median usage value for all CPU cores                                                                                                                                  |        |
| host.cpu.usage_core_min     |           | scaled_float   | The minimum usage value a CPU core                                                                                                                                        |        |
| host.cpu.usage_core_stddev  |           | scaled_float   | The standard deviation of CPU core usage Note: A high value here indicates poor parallelization of tasks on the host.                                                     |        |
| host.cpu.cores              |           | integer        | The number of CPU cores                                                                                                                                                   |        |
| host.memory.free            |           | long           | The free memory on the host. Linux note: This is the memory not being utilized by a process or the OS. A low number does not definitively mean the host is low on memory. |        |
| host.memory.total           |           | long           | The total amount of memory on the host.                                                                                                                                   |        |
| host.memory.used            |           | long           | The total memory in use on the host. Linux note: This will include memory not wired to a process.                                                                         |        |
| host.memory.used_percentage |           | scaled_float   | The ratio of used/total. Provided for convenience.                                                                                                                        |        |
| host.swap.free              |           | long           | The free swap on the host.                                                                                                                                                |        |
| host.swap.total             |           | long           | The total swap on the host.                                                                                                                                               |        |
| host.swap.used              |           | long           | The used swap on the host. Linux note: This is probably the most useful metric for determining if the host has memory pressure.                                           |        |
| host.swap.used_percentage   |           | scaled_float   | The ratio of used/total. Provided for convenience.                                                                                                                        |        |
| host.disk.free              |           | long           | The free space available                                                                                                                                                  |        |
| host.disk.mount             |           | keyword        | The mount path                                                                                                                                                            |        |
| host.disk.name              |           | keyword        | A human readable name for the disk                                                                                                                                        |        |
| host.disk.total             |           | long           | The total space available                                                                                                                                                 |        |
| host.disk.used              |           | long           | The used space                                                                                                                                                            |        |
| host.disk.used_percentage   |           | scaled_float   | The ratio of used/total. Provided for convenience.                                                                                                                        |        |

### HTTP Fields
| Field                 | Mandatory | Type    | Description | Values |
|-----------------------|-----------|---------|-------------|--------|
| http.request.referrer |           | keyword |             |        |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-http.html](https://www.elastic.co/guide/en/ecs/current/ecs-http.html)

### Kinesis Fields - EXTENSION
| Field                               | Mandatory | Type    | Description | Values |
|-------------------------------------|-----------|---------|-------------|--------|
| kinesis.partitionKey                |     :bulb:     | keyword |             |        |
| kinesis.sequenceNumber              |     :bulb:     | keyword |             |        |
| kinesis.eventID                     |     :bulb:     | keyword |             |        |
| kinesis.approximateArrivalTimestamp |     :bulb:     | float   |             |        |

Note: These fields are auto-populated by the lambda. Agents should not send these.

### Log Fields
| Field    | Mandatory | Type    | Description                                 | Values |
|----------|-----------|---------|---------------------------------------------|--------|
| log.path |    :bulb:/#    | keyword | If reading from a file, this should be set. |        |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-log.html](https://www.elastic.co/guide/en/ecs/current/ecs-log.html)

### Network Fields
| Field             | Mandatory | Type      | Description | Values          |
|-------------------|-----------|-----------|-------------|-----------------|
| [network.direction](https://www.elastic.co/guide/en/ecs/1.10/ecs-network.html#field-network-direction) |           | keyword[] |             | ingress egress  |
| network.protocol.name      |           | keyword   | The application protocol name (lowercase) | http jsonrpc |
| network.protocol.version      |           | keyword   | The version of the protocol | 1.2 |
| [network.vlan.id](https://www.elastic.co/guide/en/ecs/1.10/ecs-vlan.html#field-vlan-id)   |           | keyword   |             |                 |
| network.zone      |           | keyword   |             | DMZ ZoneB ZoneA |


### Organization Fields
| Field             | Mandatory | Type    | Description                                                                                                                                | Values |
|-------------------|-----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|
| organization.id   |     :bulb:     | keyword | Unique identifier for the organization. This is necessary for team billing and alerting. We have not decided on a standard for this field. |        |
| organization.name |           | keyword | Organization name (e.g. forestry, wildfire). Used in OpenSearch to easily group related data.                                              |        |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-organization.html](https://www.elastic.co/guide/en/ecs/current/ecs-organization.html)

### Process Fields
| Field                            | Mandatory | Type         | Description                                                    | Values |
|----------------------------------|-----------|--------------|----------------------------------------------------------------|--------|
| process.status.alive             |     :bulb:     | boolean      |                                                                |        |
| process.status.fileDescriptor    |           | long         |                                                                |        |
| process.status.cpu_percentage    |           | scaled_float | Note: CPU usage can be quite transitory.                       |        |
| process.status.memory_percentage |           | scaled_float |                                                                |        |
| process.status.VmStk             |           | long         |                                                                |        |
| process.status.VmExe             |           | long         |                                                                |        |
| process.status.VmLib             |           | long         |                                                                |        |
| process.status.VmPTE             |           | long         |                                                                |        |
| process.status.VmSwap            |           | long         |                                                                |        |
| process.status.VmPeak            |           | long         |                                                                |        |
| process.status.VmSize            |           | long         |                                                                |        |
| process.status.VmLck             |           | long         |                                                                |        |
| process.status.VmHWM             |           | long         |                                                                |        |
| process.status.VmRSS             |           | long         | This probably the memory usage field that you are looking for. |        |
| process.status.VmData            |           | long         |                                                                |        |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-process.html](https://www.elastic.co/guide/en/ecs/current/ecs-process.html)

### Related Fields
| Field        | Mandatory | Type      | Description                         | Values |
|--------------|-----------|-----------|-------------------------------------|--------|
| [related.user](https://www.elastic.co/guide/en/ecs/current/ecs-related.html#field-related-user) |     :bulb:     | keyword[] | All of the Users seen on the event. |        |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-related.html](https://www.elastic.co/guide/en/ecs/current/ecs-related.html)

### Service Fields
| Field               | Mandatory | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Values                                                                                               |
|---------------------|-----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| service.environment |     :bulb:     | keyword | This field is expected to be normalized across all applications and platforms to allow comparison (wildfire, SMT, OCP, AWS, etc.). The lambda parser 'EnvironmentStandardizeParser' should be used to do this normalization. It will populate the field labels.environment_alias with the originally sent value if it is not a normalized one. Examples: service.environment is production → No changes needed. labels.environment_alias is not set. Use of EnvironmentStandardizeParser is suggested (in case other data is not normalized) but not required.  service.environment is wfint → service.environment altered to integration. labels.environment_alias is set to wfint. Use of EnvironmentStandardizeParser is required. | development delivery integration test pre-production production training staging1 staging2 undefined |
| service.id          |           | keyword |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | e.g.: irs-dev-0, irs-dlvr-0, irs-test-0, irs-prod-0                                                  |
| service.name        |     :bulb:     | keyword | The application name. In some cases, this may not be available (even though it is manditory). Related: labels.project                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | e.g.: knox, irs-war, apache                                                                          |
| service.origin      |     :bulb:     | service | See below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |                                                                                                      |
| service.target      |     :bulb:     | service | See below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |                                                                                                      |
| service.type        |    :bulb:/#    | keyword | Internal names for COTS products should not be used here. Optional if service.name is the same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | e.g.: vault, irs-war, apache                                                                         |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-service.html](https://www.elastic.co/guide/en/ecs/current/ecs-service.html)

#### Which service to use?
There are three service objects defined in the ECS. It can be a bit confusing which field to use. The ECS provides some minimal guidance. Basically, it breaks down to:

- service: What made the log
- service.origin: What caused the log
- service.target: Who is the log for

Examples

| Index               | Source                     | service              | service.origin                           | service.target                                                  |
|---------------------|----------------------------|----------------------|------------------------------------------|-----------------------------------------------------------------|
| nrm-access-external | Smarties/skittles          | apache reverse proxy | None. Usually a random user on internet. | What was sent the request and responded.                        |
|                     | OCP App                    | OCP App              | None. Usually a random user on internet. | None if the service logging also responded.                     |
| nrm-audit-vault     | Knox (IIT Hashicorp Vault) | Knox                 | None. Usually a random user on internet. | Set if the path called reveals which service this audit is for. |

### Server Fields
Recommendation: Use [Destination Fields](https://apps.nrs.gov.bc.ca/int/confluence/display/1TEAM/Common+Schema#CommonSchema-destination-fields)

Server fields are for adding semantic context to an exchange. Generally, this is not necessary and/or a duplication.

### Source Fields
| Field       | Mandatory | Type   | Description                                                          | Values |
|-------------|-----------|--------|----------------------------------------------------------------------|--------|
| [source.user](https://apps.nrs.gov.bc.ca/int/confluence/display/1TEAM/Common+Schema#CommonSchema-user-fields) |           | object | If the source is associated a user, source.user should be populated. |        |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-source.html](https://www.elastic.co/guide/en/ecs/current/ecs-source.html)

### TLS Fields
Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-tls.html](https://www.elastic.co/guide/en/ecs/current/ecs-tls.html)

### URL Fields
| Field       | Mandatory | Type    | Description                                                                                                                                                                           | Values |
|-------------|-----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| url.context |           | keyword | The path prefix used to distinguish how traffic is treated/routed. This should only be used with access requests going through a single domain that is used by multiple applications. | /int   |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-url.html](https://www.elastic.co/guide/en/ecs/current/ecs-url.html)

### User Agent Fields
| Field                      | Mandatory | Type    | Description | Value  |
|----------------------------|-----------|---------|-------------|--------|
| user_agent.device.type   |           | keyword |             | mobile |
| user_agent.device.vendor |           | keyword |             | Apple  |

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html](https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html)

### User Fields
If the user is associated with the source or destination then it should be populated under those fields.

Reference: [https://www.elastic.co/guide/en/ecs/current/ecs-user.html](https://www.elastic.co/guide/en/ecs/current/ecs-user.html)

### Elastic Search Metadata fields
| Field  | Description                                                                                          |
|--------|------------------------------------------------------------------------------------------------------|
| _id    | The unique id of the record in the index. This should be derived from record and static if possible. |
| _type  | It is deprecated, but the valued "_doc" must be provided                                             |
| _index | The index the data is added to                                                                       |

