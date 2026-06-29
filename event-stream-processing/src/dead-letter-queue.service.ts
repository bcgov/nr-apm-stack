import { inject, injectable } from 'inversify';
import { OsDocumentPipeline } from './types/os-document';
import {
  FirehoseClient,
  PutRecordBatchCommand,
  PutRecordBatchCommandInput,
} from '@aws-sdk/client-firehose';
import { TYPES } from './inversify.types';
import type { LoggerService } from './util/logger.service';

@injectable()
/**
 * Service to persist data unable to be sent to OpenSearch
 */
export class DeadLetterQueueService {
  constructor(@inject(TYPES.LoggerService) private logger: LoggerService) {}
  private enc = new TextEncoder();
  private client = new FirehoseClient({
    region: process.env.AWS_DEFAULT_REGION || 'ca-central-1',
  });

  public async send({ failures }: OsDocumentPipeline) {
    const dlqFailures = failures.filter((failure) => !failure.options?.skipDlq);
    if (dlqFailures.length === 0) {
      return;
    }
    const chunkSize = 50;
    for (let i = 0; i < dlqFailures.length; i += chunkSize) {
      const chunk = dlqFailures.slice(i, i + chunkSize);
      const input: PutRecordBatchCommandInput = {
        DeliveryStreamName: process.env.DLQ_STREAM_NAME,
        Records: chunk.map((pipelineObject) => {
          return {
            Data: this.enc.encode(JSON.stringify(pipelineObject) + '\n'),
          };
        }),
      };
      const command = new PutRecordBatchCommand(input);
      try {
        const response = await this.client.send(command);
        if (
          response.$metadata.httpStatusCode !== 200 ||
          response.FailedPutCount === undefined ||
          response.FailedPutCount > 0
        ) {
          this.logger.log('DLQ_RESP_ERROR: ' + JSON.stringify(response));
        }
      } catch (error) {
        this.logger.log('DLQ_ERROR: ' + JSON.stringify(error));
      }
    }
  }
}
