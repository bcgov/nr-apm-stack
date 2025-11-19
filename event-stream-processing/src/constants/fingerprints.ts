import {
  OsDocumentFingerprint,
  FingerprintCategory,
} from '../types/os-document';

export const FINGERPRINT_UNKNOWN: OsDocumentFingerprint = {
  name: FingerprintCategory.UNKNOWN,
  fingerprint: null,
  dataDefaults: {
    '@metadata': {
      docId: 'kinesis.eventID,event.hash',
    },
  },
};

export const FINGERPRINTS: OsDocumentFingerprint[] = [
  {
    name: FingerprintCategory.APACHE_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'apache.access',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-access-external-<%=YYYY.MM.DD=%>',
        indexPreprodQualifier: true,
        timestampFormat: 'DD/MMM/YYYY:HH:mm:ss Z',
        timestampGuard: 'P8D',
        apacheAccessLog: true,
        appClassification: true,
        deslash: true,
        environmentStandardize: true,
        urlExplode: true,
        geoIp: true,
        httpStatusOutcome: true,
        threatPhp: true,
        userAgent: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.APACHE_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'apache.access.internal',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-access-internal-<%=YYYY.MM.DD=%>',
        indexPreprodQualifier: true,
        timestampFormat: 'DD/MMM/YYYY:HH:mm:ss Z',
        timestampGuard: 'P8D',
        apacheAccessLog: true,
        appClassification: true,
        deslash: true,
        environmentStandardize: true,
        urlExplode: true,
        geoIp: true,
        httpStatusOutcome: true,
        threatPhp: true,
        userAgent: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.WIN_IIS_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'iis.access',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-access-external-<%=YYYY.MM.DD=%>',
        indexPreprodQualifier: true,
        timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
        timestampGuard: 'P8D',
        iisAccessLog: true,
        appClassification: true,
        deslash: true,
        environmentStandardize: true,
        geoIp: true,
        httpStatusOutcome: true,
        threatPhp: true,
        userAgent: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.WIN_IIS_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'iis.access.internal',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-access-internal-<%=YYYY.MM.DD=%>',
        indexPreprodQualifier: true,
        timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
        timestampGuard: 'P8D',
        iisAccessLog: true,
        appClassification: true,
        deslash: true,
        environmentStandardize: true,
        geoIp: true,
        httpStatusOutcome: true,
        threatPhp: true,
        userAgent: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.HTTP_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'express.access',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: '@timestamp,host.name,event.sequence,event.original',
        docId: 'labels.project,service.name,event.sequence,event.hash',
        index: 'nrm-access-external-<%=YYYY.MM.DD=%>',
        indexPreprodQualifier: true,
        environmentStandardize: true,
        geoIp: true,
        httpStatusOutcome: true,
        rename: 'labels.azp:source.user.id',
        timestampGuard: 'P8D',
        userAgent: true,
      },
    },
  },
  {
    name: FingerprintCategory.HTTP_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'generic.access',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: '@timestamp,host.name,event.sequence,event.original',
        docId: 'labels.project,service.name,event.sequence,event.hash',
        index: 'nrm-access-external-<%=YYYY.MM.DD=%>',
        indexPreprodQualifier: true,
        environmentStandardize: true,
        geoIp: true,
        httpStatusOutcome: true,
        timestampGuard: 'P8D',
        urlExplode: true,
        userAgent: true,
      },
    },
  },
  {
    name: FingerprintCategory.WSO2_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'wso2.access',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: '@timestamp,host.name,event.sequence,event.original',
        docId: 'labels.project,service.name,event.sequence,event.hash',
        index: 'nrm-access-internal-<%=YYYY.MM.DD=%>',
        timestampFormat: 'DD/MMM/YYYY:HH:mm:ss Z',
        timestampGuard: 'P1Y',
        wso2AccessLog: true,
        appClassification: true,
        environmentStandardize: true,
        urlExplode: true,
        httpStatusOutcome: true,
        geoIp: true,
        threatPhp: true,
        userAgent: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.TOMCAT_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'tomcat.access',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-access-internal-<%=YYYY.MM.DD=%>',
        timestampFormat: 'DD/MMM/YYYY:HH:mm:ss Z',
        appClassification: true,
        deslash: true,
        environmentStandardize: true,
        urlExplode: true,
        httpStatusOutcome: true,
        tomcatLog: true,
        threatPhp: true,
        timestampGuard: 'P14D',
        userAgent: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.TOMCAT_ACCESS_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'geoserver.audit',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-access-internal-<%=YYYY.MM.DD=%>',
        timestampFormat: 'DD/MMM/YYYY:HH:mm:ss Z',
        appClassification: true,
        deslash: true,
        environmentStandardize: true,
        urlExplode: true,
        httpStatusOutcome: true,
        timestampGuard: 'P14D',
        userAgent: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.TOMCAT_LOCALHOST_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'tomcat.localhost',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-tomcat-localhost-<%=YYYY.MM.DD=%>',
        timestampField: '@timestamp',
        timestampFormat: 'DD-MMM-YYYY HH:mm:ss.SSS',
        timestampTimezone: 'America/Vancouver',
        timestampGuard: 'P14D',
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.TOMCAT_CATALINA_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'tomcat.catalina',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-tomcat-catalina-<%=YYYY.MM.DD=%>',
        timestampField: '@timestamp',
        timestampFormat: 'DD-MMM-YYYY HH:mm:ss.SSS',
        timestampTimezone: 'America/Vancouver',
        timestampGuard: 'P14D',
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.APP_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'application.log',
      },
      service: {
        name: 'fmeserver',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,@timestamp',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-app-generic-<%=YYYY.MM.DD=%>',
        timestampField: '@timestamp',
        timestampFormat: 'ddd-DD-MMM-YYYY-h:mm:ss.SSS-a',
        timestampTimezone: 'America/Vancouver',
        timestampGuard: 'P14D',
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.APP_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'application.log',
      },
      service: {
        name: 'knox',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,@timestamp',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-app-generic-<%=YYYY.MM.DD=%>',
        timestampGuard: 'P14D',
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.APP_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'wso2.carbon',
      },
      service: {
        name: 'api-manager',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,@timestamp',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-app-generic-<%=YYYY.MM.DD=%>',
        timestampField: '@timestamp',
        timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
        timestampTimezone: 'America/Vancouver',
        timestampGuard: 'P14D',
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.APP_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'application.log',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-app-generic-<%=YYYY.MM.DD=%>',
        timestampField: '@timestamp',
        timestampFormat: 'DD-MMM-YYYY HH:mm:ss.SSS',
        timestampTimezone: 'America/Vancouver',
        timestampGuard: 'P14D',
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.APP_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'application.log.utc',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,@timestamp',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-app-generic-<%=YYYY.MM.DD=%>',
        timestampField: '@timestamp',
        timestampGuard: 'P14D',
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.MQ_AUDIT_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'mq.audit',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,event.original',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-audit-mq-<%=YYYY.MM.DD=%>',
        timestampField: '@timestamp',
        timestampFormat: 'DD-MMM-YYYY HH:mm:ss.SSS',
        timestampTimezone: 'America/Vancouver',
        timestampGuard: 'P14D',
        geoIp: true,
        environmentStandardize: true,
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.VAULT_AUDIT_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'web',
        dataset: 'vault.audit',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'service.name,response.data_json',
        docId: 'kinesis.eventID,event.hash',
        geoIp: true,
        index: 'nrm-audit-vault-<%=YYYY.MM.DD=%>',
        indexPreprodQualifier: true,
        timestampGuard: 'P14D',
        keyAsPath: true,
      },
    },
  },
  {
    name: FingerprintCategory.METRICS,
    fingerprint: {
      event: {
        kind: 'event',
        category: 'configuration',
        type: 'installation',
      },
    },
    dataDefaults: {
      '@metadata': {
        hash: 'host.hostname,basename(log.file.path),event.sequence,@timestamp',
        docId: 'basename(log.file.path),event.sequence,event.hash',
        index: 'nrm-deploy-<%=YYYY.MM=%>',
        environmentStandardize: true,
        timestampGuard: 'P1Y',
      },
    },
  },
  {
    name: FingerprintCategory.BROKER_AUDIT_LOGS,
    fingerprint: {
      event: {
        kind: 'event',
        dataset: 'broker.audit',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-audit-broker-<%=YYYY.MM.DD=%>',
        environmentStandardize: true,
        geoIp: true,
        timestampGuard: 'PT300M',
      },
    },
  },
  {
    name: FingerprintCategory.METRICS,
    fingerprint: {
      event: {
        kind: 'metric',
        dataset: 'host.cpu',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-metrics-<%=YYYY.MM.DD=%>',
        timestampGuard: 'PT300M',
        environmentStandardize: true,
      },
    },
  },
  {
    name: FingerprintCategory.METRICS,
    fingerprint: {
      event: {
        kind: 'metric',
        dataset: 'host.memory',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-metrics-<%=YYYY.MM.DD=%>',
        timestampGuard: 'PT300M',
        environmentStandardize: true,
      },
    },
  },
  {
    name: FingerprintCategory.METRICS,
    fingerprint: {
      event: {
        kind: 'metric',
        dataset: 'host.disk_usage',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-metrics-<%=YYYY.MM.DD=%>',
        timestampGuard: 'PT300M',
        environmentStandardize: true,
      },
    },
  },
  {
    name: FingerprintCategory.METRICS,
    fingerprint: {
      event: {
        kind: 'metric',
        dataset: 'host.network',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-metrics-<%=YYYY.MM.DD=%>',
        timestampGuard: 'PT300M',
        environmentStandardize: true,
      },
    },
  },
  {
    name: FingerprintCategory.METRICS,
    fingerprint: {
      event: {
        kind: 'metric',
        dataset: 'process.info',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-metrics-<%=YYYY.MM.DD=%>',
        timestampGuard: 'PT300M',
        urlExplode: true,
        environmentStandardize: true,
      },
    },
  },
  {
    name: FingerprintCategory.METRICS,
    fingerprint: {
      event: {
        kind: 'metric',
        dataset: 'host.proc',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-metrics-<%=YYYY.MM.DD=%>',
        timestampGuard: 'PT300M',
        environmentStandardize: true,
      },
    },
  },
  {
    name: FingerprintCategory.PIPELINE,
    fingerprint: {
      event: {
        kind: 'metric',
        dataset: 'pipeline.batch',
      },
    },
    dataDefaults: {
      '@metadata': {
        docId: 'kinesis.eventID',
        index: 'nrm-pipeline-opensearch-<%=YYYY.MM.DD=%>',
        timestampGuard: 'PT300M',
        environmentStandardize: true,
      },
    },
  },
  // Unknown should be last
  FINGERPRINT_UNKNOWN,
];
