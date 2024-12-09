# OpenSearch Data Indices and Lifecycle

## Index Format
nrm - (type) - (qualifier) .(lifecycle) - (date splitter)

| Part          	| Usage    	| Description                                                                                                                                                                                                                                                                                                                                     	|
|---------------	|----------	|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------	|
| type          	| Required 	| The generic type of the documents. In the best case scenario, this is sufficient to determine the fields and lifecycle.                                                                                                                                                                                                                         	|
| qualifier     	| Optional 	| Used when the type is insufficient to determine the fields required for the index. An example is an audit log for an application. As this varies per application, 'nrm-audit' is insufficiently specific. Another example is a subtype where a group of applications may require more (or just different) fields compared to the generic type.  	|
| lifecycle     	| Avoid    	| Lifecycle should only ever be used in extreme cases where a large portion of the documents stored in the type/qualifier must be deleted much earlier than the standard lifecycle for the type/qualifier combo allows. Really avoid multiple lifecycles on a single index name.                                                                  	|
| date splitter 	| Required 	| This is usually the year-month-day or year-month. The splitter used is largely up to how much data is incoming and the lifecycle. (You can't delete an index split monthly on a weekly schedule for example.)                                                                                                                                   	|

The 'nrm - (type) - (qualifier)' portion (or without the qualifier) will be referred to as the index name, below.

## Data Indices
| Index Name           	| Target                   	| Aliases    	| Additional Description                                                               	|
|----------------------	|--------------------------	|------------	|--------------------------------------------------------------------------------------	|
| nrm-access-external  	| External access          	| nrm-access 	| Web access to urls.                                                                  	|
| nrm-access-internal  	| Internal access          	|            	| Web access to urls where access already captured by load balancer/reverse proxy logs 	|
| nrm-audit-broker     	| NR Broker audit data     	|            	| See: NR Broker Audit Log                                                             	|
| nrm-deploy           	| Deployment data          	|            	| Replaced by nrm-audit-broker                                                         	|
| nrm-app-generic      	| Generic application logs 	|            	| Generic application logs where the log message is not parsed                         	|
| nrm-audit-mq         	| Message queue            	|            	| Currently only used by ActiveMQ                                                      	|
| nrm-audit-vault      	| Vault audit data         	|            	|                                                                                      	|
| nrm-metrics          	| Server & Process metrics 	|            	|                                                                                      	|
| nrm-tomcat-catalina  	| Tomcat catalina logs     	|            	|                                                                                      	|
| nrm-tomcat-localhost 	| Tomcat localhost logs    	|            	|                                                                                      	|

Aliases: The index name is always an alias as well.

## Index Lifecycle
Generally, fresher data is examined more often so more resources are utilized to make that faster. All indices start on hot data nodes.

| Index Name           | Performance | Scale Down at | Merge at | Warm at | Delete at | Rollup |
|----------------------|-------------|---------------|----------|---------|-----------|--------|
| nrm-access-external  |             |               | 5 weeks  | 40 days | Unknown   | No     |
| nrm-access-internal  |             |               | 7 days   | 10 days | 4 weeks   | No     |
| nrm-app-generic      |             |               | 7 days   | 10 days | 2 weeks   | No     |
| nrm-audit-broker     |             |               | 2 days   | 10 days | Years?    | No     |
| nrm-audit-mq         |             |               | 7 days   | 10 days | 4 weeks   | No     |
| nrm-audit-vault      |             |               | 40 days  | 45 days | Years?    | No     |
| nrm-deploy           |             |               | 40 days  | 45 days | No        | No     |
| nrm-metrics          |             |               | 2 days   | 4 days  | 4 weeks   | No     |
| nrm-tomcat-catalina  |             |               | 7 days   | 10 days | 2 weeks   | No     |
| nrm-tomcat-localhost |             |               | 7 days   | 10 days | 2 weeks   | No     |

### Column notes
- Performance: The increase in replica count initially to boost it. All indexes have a single replica (and a single primary).
- Scale down at: When the increase in replica count is reduced to save storage space
- Merge at: When a 'force_merge' occurs that renders the index read-only and optimizes storage. This means logs older than this can not be loaded (easily).
- Warm at: When the index is transitioned for hot to warm data nodes (with expected decrease in performance)
- Delete at: When the index is removed.
- Rollup: Are stats from the indices rolled up into another index for indefinite usage?

## Appendix
Explanation of why certain qualifiers are used or not

| Type  | Qualifier | Description                                                                                                        |
|-------|-----------|--------------------------------------------------------------------------------------------------------------------|
| app   | (blank)   | Never. Types of applications are encouraged to group themselves into generic types.                                |
| app   | (appname) | Applications will be permitted their own index provided they are extracting unique fields from their log messages. |
| audit | (blank)   | Never. Audit logs are specific to an application so a generic type would not make sense.                           |

## Standard Lifecycle Modifiers
These modifiers are for edge cases where the long term cost of a subset of the data greatly outweighs the utility of keeping it around. Lifecycle modifiers are not recommended because fewer indices decreases the overall data size and speeds query response. A fair bit of analysis should go into any decision to use one.

| Modifier | Description                                                                                                                                                                                                                                                                  |
|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| preprod  | This is used to split non-production data from the production data. This split will be determined by the service.environment field. This can be used where there is a large volume of non-production data mixed with production data. Production data will have no modifier. |

## Index Format & Lifecycle Implementation
The above information is an adaption of the infrastructure code.

Index templates: [https://github.com/bcgov/nr-apm-stack/tree/master/workflow-cli/configuration-opensearch/index_template](https://github.com/bcgov/nr-apm-stack/tree/master/workflow-cli/configuration-opensearch/index_template)

Index policies: [https://github.com/bcgov/nr-apm-stack/tree/master/workflow-cli/configuration-opensearch/state_management_policy](https://github.com/bcgov/nr-apm-stack/tree/master/workflow-cli/configuration-opensearch/state_management_policy)

## Reference
[Troubleshooting Elasticsearch ILM: Common issues and fixes](https://www.elastic.co/blog/troubleshooting-elasticsearch-ilm-common-issues-and-fixes)