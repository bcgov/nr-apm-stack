import { injectable, inject, tagged } from 'inversify';
import { TYPES } from './inversify.types';
import { KinesisStreamService } from './kinesis-stream.service';
import { OsDocumentData } from './types/os-document';
import { Context, KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import type { LoggerService } from './util/logger.service';

@injectable()
/**
 * Coordinates transforming the data and then bulk uploading it to OpenSearch
 */
export class KinesisStreamWrapperService {
  /**
   * Construct the wrapper service. The tagging of KinesisStreamService with localhost alters the binding behaviour.
   * @param kinesisStreamService
   */
  constructor(
    @inject(TYPES.KinesisStreamService)
    @tagged('localhost', true)
    private kinesisStreamService: KinesisStreamService,
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
  ): Promise<void> {
    await this.kinesisStreamService.handle(event, context, true);
  }

  /**
   * Handle received data by wrapping in a mock KinesisStreamRecord and forwarding on
   * @param data The data to wrap
   * @returns Promise with the result
   */
  async handleData(data: OsDocumentData, print: boolean): Promise<void> {
    const event: KinesisStreamEvent = {
      Records: [this.wrapDataIntoRecord(data)],
    };
    // unused so any value will work
    const context: Context = {} as Context;
    const kss = await this.kinesisStreamService.handle(event, context, print);
    return kss;
  }

  /**
   * Wraps data into a KinesisStreamRecord
   * @param data The data to wrap
   * @returns The mocked KinesisStreamRecord
   */
  private wrapDataIntoRecord(data: OsDocumentData): KinesisStreamRecord {
    return {
      awsRegion: 'ca-central-1',
      eventID: 'string',
      eventName: 'string',
      eventSource: 'string',
      eventSourceARN: 'string',
      eventVersion: 'string',
      invokeIdentityArn: 'string',
      kinesis: {
        approximateArrivalTimestamp: 0,
        data: Buffer.from(JSON.stringify(data), 'utf8').toString('base64'),
        kinesisSchemaVersion: 'string',
        partitionKey: 'string',
        sequenceNumber: 'string',
      },
    };
  }
}
