// file types.ts

const TYPES = {
  BrokerApi: Symbol.for('BrokerApi'),
  BrokerApiUrl: Symbol.for('BrokerApiUrl'),
  BrokerToken: Symbol.for('BrokerToken'),
  OpenSearchController: Symbol.for('OpenSearchController'),
  AwsRenderService: Symbol.for('AwsRenderService'),
  AwsSystemsManagerService: Symbol.for('AwsSystemsManagerService'),
  LambdaAssetDownloadService: Symbol.for('LambdaAssetDownloadService'),
  NotificationService: Symbol.for('NotificationService'),
  OpenSearchDomainService: Symbol.for('OpenSearchDomainService'),
  OpenSearchTemplateService: Symbol.for('OpenSearchTemplateService'),
  OpenSearchPolicyService: Symbol.for('OpenSearchPolicyService'),
  OpenSearchMonitorService: Symbol.for('OpenSearchMonitorService'),
  OpenSearchNotificationsService: Symbol.for('OpenSearchNotificationsService'),
  VaultApi: Symbol.for('VaultApi'),
  VaultApiUrl: Symbol.for('VaultApiUrl'),
  VaultToken: Symbol.for('VaultToken'),
};

export { TYPES };
