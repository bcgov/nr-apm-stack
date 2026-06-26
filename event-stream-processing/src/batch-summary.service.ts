import type { LoggerService } from './util/logger.service';
import { SQSBatchResponse } from 'aws-lambda';
import { inject, injectable } from 'inversify';
import { TYPES } from './inversify.types';
import {
  KinesisStreamRecordDecodeFailure,
  OsDocumentCommitFailure,
  OsDocumentPipeline,
  OsDocumentProcessingFailure,
} from './types/os-document';

@injectable()
/**
 *
 */
export class BatchSummaryService {
  constructor(@inject(TYPES.LoggerService) private logger: LoggerService) {}

  /**
   * Summarizes the logs as a JSON object.
   * @param pipeline The pipeline with processed documents
   */
  public logSummary(pipeline: OsDocumentPipeline) {
    let decodeFailed = 0;
    let processFailed = 0;
    let commitFailed = 0;
    for (const obj of pipeline.failures) {
      if (obj instanceof KinesisStreamRecordDecodeFailure) {
        decodeFailed++;
      } else if (obj instanceof OsDocumentProcessingFailure) {
        processFailed++;
      } else if (obj instanceof OsDocumentCommitFailure) {
        commitFailed++;
      }
    }
    const received = pipeline.documents.length + pipeline.failures.length;
    const decoded = received - decodeFailed;
    const processed = decoded - processFailed;
    const committed = processed - commitFailed;
    const batch = {
      received,
      decoded,
      decode_failed: decodeFailed,
      processed,
      process_failed: processFailed,
      committed,
      commit_failed: commitFailed,
      failed: pipeline.failures.length,
    };

    this.logger.log(JSON.stringify(batch));
  }

  /**
   * Log the sent objects as a JSON object.
   * @param pipeline The pipeline with processed documents
   */
  public logDocuments(pipeline: OsDocumentPipeline) {
    if (pipeline.documents.length === 0) {
      return;
    }
    this.logger.log(JSON.stringify(pipeline.documents));
  }

  /**
   * Summarizes the errors as a JSON object and log.
   * @param pipeline The pipeline with processed documents
   */
  public logMessages(pipeline: OsDocumentPipeline) {
    if (pipeline.failures.length === 0) {
      return;
    }
    const errorMessages = {
      errors: pipeline.failures.map((pipelineObject) => pipelineObject.message),
    };
    this.logger.log(JSON.stringify(errorMessages));
  }

  /**
   * Builds an error response for Kinesis.
   * @param pipeline The pipeline with processed documents
   * @returns An object contianing the failed record ids or null if no errors occurred.
   * SQSBatchResponse has the same interface as a Kinesis batch response.
   */
  public buildErrorResponse(
    pipeline: OsDocumentPipeline,
  ): SQSBatchResponse | null {
    if (pipeline.failures.length > 0) {
      const errorResponse = {
        batchItemFailures: pipeline.failures.map((failure) => {
          if ('record' in failure.source) {
            return {
              itemIdentifier: failure.source.record.kinesis.sequenceNumber,
            };
          } else {
            return {
              itemIdentifier: failure.source.kinesis.sequenceNumber,
            };
          }
        }),
      };
      return errorResponse;
    }
    return null;
  }
}
