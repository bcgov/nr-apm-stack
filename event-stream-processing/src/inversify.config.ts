import { Container, BindingScope } from 'inversify';
import { TYPES } from './inversify.types';

// Services
import { AwsHttpClientService } from './util/aws-http-client.service';
import { BatchSummaryService } from './batch-summary.service';
import { DateAndTimeService } from './shared/date-and-time.service';
import { EcsTransformService } from './ecs-transform.service';
import { FieldExtractorService } from './shared/field-extractor.service';
import { GeoIpService } from './util/geoip.service';
import { GeoIpMaxmindService } from './util/geoip-maxmind.service';
import { HttpRequestService } from './shared/http-request.service';
import { OpenSearchService } from './open-search.service';
import { OpenSearchDummyService } from './open-search-dummy.service';
import { OpenSearchPostService } from './open-search-post.service';
import { KinesisStreamRecordMapperService } from './shared/kinesis-stream-record-mapper.service';
import { KinesisStreamService } from './kinesis-stream.service';
import { KinesisStreamWrapperService } from './kinesis-stream-wrapper.service';
import { LoggerConsoleService } from './util/logger-console.service';
import { LoggerService } from './util/logger.service';
import { MaxmindCityLookupService } from './util/maxmindCityLookup.service';
import { MaxmindAsnLookupService } from './util/maxmindAsnLookup.service';
import { RegexService } from './shared/regex.service';
import { SubsetService } from './shared/subset.service';

// Parsers
import { Parser } from './types/parser';
import { ApacheParser } from './parsers/apache.parser';
import { ApplicationClassificationParser } from './parsers/application-classification.parser';
import { DeslashParser } from './parsers/deslash.parser';
import { DocumentIdParser } from './parsers/document-id.parser';
import { DocumentIndexParser } from './parsers/document-index.parser';
import { EnvironmentStandardizeParser } from './parsers/environment-standardize.parser';
import { KinesisParser } from './parsers/kinesis.parser';
import { GeoIpParser } from './parsers/geo-ip.parser';
import { HashParser } from './parsers/hash.parser';
import { HttpStatusEventOutcomeParser } from './parsers/http-status-event-outcome.parser';
import { IpvParser } from './parsers/ipv.parser';
import { JoinKvParser } from './parsers/join-kv.parser';
import { KeyAsPathParser } from './parsers/key-as-path.parser';
import { RemoveMetadataParser } from './parsers/remove-metadata.parser';
import { RenameParser } from './parsers/rename.parser';
import { ThreatPhpParser } from './parsers/threat-php.parser';
import { TimestampFieldParser } from './parsers/timestamp-field.parser';
import { TimestampGuardParser } from './parsers/timestamp-guard.parser';
import { TomcatParser } from './parsers/tomcat.parser';
import { UserAgentParser } from './parsers/user-agent.parser';
import { UrlExplodeParser } from './parsers/url-explode.parser';
import { Wso2AccessParser } from './parsers/wso2access.parser';
import { IISParser } from './parsers/IIS.parser';
import { DeadLetterQueueService } from './dead-letter-queue.service';

/**
 * Create the container
 * @returns The container
 */
function create(): Container {
  const myContainer = new Container({
    defaultScope: 'Singleton' as BindingScope,
  });
  myContainer.bind<LoggerService>(TYPES.LoggerService).to(LoggerConsoleService);
  myContainer
    .bind<EcsTransformService>(TYPES.EcsTransformService)
    .to(EcsTransformService);
  myContainer
    .bind<FieldExtractorService>(TYPES.FieldExtractorService)
    .to(FieldExtractorService);
  myContainer.bind<GeoIpService>(TYPES.GeoIpService).to(GeoIpMaxmindService);
  myContainer
    .bind<HttpRequestService>(TYPES.HttpRequestService)
    .to(HttpRequestService);
  myContainer
    .bind<MaxmindCityLookupService>(TYPES.MaxmindCityLookupService)
    .to(MaxmindCityLookupService);
  myContainer
    .bind<MaxmindAsnLookupService>(TYPES.MaxmindAsnLookupService)
    .to(MaxmindAsnLookupService);
  myContainer
    .bind<AwsHttpClientService>(TYPES.AwsHttpClientService)
    .to(AwsHttpClientService);
  myContainer
    .bind<OpenSearchService>(TYPES.OpenSearchService)
    .to(OpenSearchPostService)
    .whenNoAncestorTagged('localhost', true);
  myContainer
    .bind<OpenSearchService>(TYPES.OpenSearchService)
    .to(OpenSearchDummyService)
    .whenAnyAncestorTagged('localhost', true);
  myContainer
    .bind<KinesisStreamRecordMapperService>(
      TYPES.KinesisStreamRecordMapperService,
    )
    .to(KinesisStreamRecordMapperService);
  myContainer
    .bind<KinesisStreamService>(TYPES.KinesisStreamService)
    .to(KinesisStreamService);
  myContainer
    .bind<KinesisStreamWrapperService>(TYPES.KinesisStreamWrapperService)
    .to(KinesisStreamWrapperService);

  myContainer
    .bind<DateAndTimeService>(TYPES.DateAndTimeService)
    .to(DateAndTimeService);
  myContainer.bind<RegexService>(TYPES.RegexService).to(RegexService);
  myContainer.bind<SubsetService>(TYPES.SubsetService).to(SubsetService);
  myContainer
    .bind<BatchSummaryService>(TYPES.BatchSummaryService)
    .to(BatchSummaryService);
  myContainer
    .bind<DeadLetterQueueService>(TYPES.DeadLetterQueueService)
    .to(DeadLetterQueueService)
    .whenNoAncestorTagged('localhost', true);

  // Stage: PreInit
  myContainer.bind<Parser>(TYPES.PreInitParser).to(KeyAsPathParser);

  // Stage: Init
  myContainer.bind<Parser>(TYPES.InitParser).to(KinesisParser);

  // Stage: PreParse
  myContainer.bind<Parser>(TYPES.PreParser).to(ApacheParser);
  myContainer.bind<Parser>(TYPES.PreParser).to(Wso2AccessParser);
  myContainer.bind<Parser>(TYPES.PreParser).to(TomcatParser);
  myContainer.bind<Parser>(TYPES.PreParser).to(IISParser);
  myContainer.bind<Parser>(TYPES.PreParser).to(RenameParser);

  // Stage: Parse
  myContainer.bind<Parser>(TYPES.Parser).to(DeslashParser);
  myContainer.bind<Parser>(TYPES.Parser).to(EnvironmentStandardizeParser);
  myContainer.bind<Parser>(TYPES.Parser).to(HttpStatusEventOutcomeParser);
  myContainer.bind<Parser>(TYPES.Parser).to(IpvParser);
  myContainer.bind<Parser>(TYPES.Parser).to(JoinKvParser);
  myContainer.bind<Parser>(TYPES.Parser).to(GeoIpParser);
  myContainer.bind<Parser>(TYPES.Parser).to(UserAgentParser);
  myContainer.bind<Parser>(TYPES.Parser).to(UrlExplodeParser);
  myContainer.bind<Parser>(TYPES.Parser).to(ApplicationClassificationParser);
  myContainer.bind<Parser>(TYPES.Parser).to(ThreatPhpParser);

  // Stage: Post Parse
  myContainer.bind<Parser>(TYPES.PostParser).to(HashParser);

  // Stage: FINALIZE
  myContainer.bind<Parser>(TYPES.FinalizeParser).to(TimestampFieldParser);
  myContainer.bind<Parser>(TYPES.FinalizeParser).to(TimestampGuardParser);
  myContainer.bind<Parser>(TYPES.FinalizeParser).to(DocumentIndexParser);
  myContainer.bind<Parser>(TYPES.FinalizeParser).to(DocumentIdParser);
  myContainer.bind<Parser>(TYPES.FinalizeParser).to(RemoveMetadataParser);

  return myContainer;
}
const myContainer = create();

export { myContainer, TYPES };
