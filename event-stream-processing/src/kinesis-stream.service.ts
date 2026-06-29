import { Context, KinesisStreamEvent } from 'aws-lambda';
import { injectable, inject, optional } from 'inversify';
import { OpenSearchService } from './open-search.service';
import { TYPES } from './inversify.types';
import type { LoggerService } from './util/logger.service';
import { EcsTransformService } from './ecs-transform.service';
import { BatchSummaryService } from './batch-summary.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';

@injectable()
/**
 * Coordinates transforming the data and then bulk uploading it to OpenSearch
 */
export class KinesisStreamService {
  /**
   * Construct the KinesisStreamService
   * @param ecsTransformService
   * @param openSearch
   * @param logger
   */
  constructor(
    @inject(TYPES.EcsTransformService)
    private ecsTransformService: EcsTransformService,
    @inject(TYPES.OpenSearchService) private openSearch: OpenSearchService,
    @inject(TYPES.BatchSummaryService)
    private batchSummary: BatchSummaryService,
    @inject(TYPES.DeadLetterQueueService)
    @optional()
    private deadLetterQueue: DeadLetterQueueService | undefined,
    @inject(TYPES.LoggerService) private logger: LoggerService,
  ) {}

  /**
   * Handle the Kinesis event by transforming and then bulk uploading to OpenSearch
   * @param event The event containing the data to transform
   * @param context The lambda context
   * @returns A promise to wait on
   */
  public async handle(
    event: KinesisStreamEvent,
    context: Context,
    print = false,
  ): Promise<void> {
    const receivedCount = event.Records.length;
    this.logger.debug(
      `Transforming ${receivedCount} kinesis records to OS documents`,
    );
    // Extract records from Kinesis event to documents and process according to fingerprint & meta instructions
    const transformedPipeline = this.ecsTransformService.transform(event);
    const processedCount = transformedPipeline.documents.length;
    this.logger.debug(`Submitting ${processedCount} documents to OS`);
    // Bulk send documents
    const sentPipeline = await this.openSearch.bulk(transformedPipeline);
    // const receivedRecords = sentPipeline.documents.length;
    const committedCount = sentPipeline.documents.length;
    const failedCount = sentPipeline.failures.length;
    this.logger.debug(`${committedCount} documents added`);
    this.logger.debug(`${failedCount} documents failed`);
    this.batchSummary.logSummary(sentPipeline);
    if (print) {
      this.batchSummary.logDocuments(sentPipeline);
    }
    this.batchSummary.logMessages(sentPipeline);

    if (this.deadLetterQueue && failedCount > 0) {
      await this.deadLetterQueue.send(sentPipeline);
    }

    return (Promise<void>).resolve();
  }
}
