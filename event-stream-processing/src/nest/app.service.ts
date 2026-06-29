import { Body, Injectable } from '@nestjs/common';
import { myContainer } from '../inversify.config';
import { TYPES } from '../inversify.types';
import { KinesisStreamWrapperService } from '../kinesis-stream-wrapper.service';
import type { OsDocumentData } from '../types/os-document';

@Injectable()
export class AppService {
  /**
   * Handles the data received as a mock Kinesis event
   * @param data The data to pass into the parser
   * @param print If true, print the data to the console
   * @returns Promise with the result
   */
  handleKinesisEvent(
    @Body() data: OsDocumentData,
    print: boolean,
  ): Promise<void> {
    return myContainer
      .get<KinesisStreamWrapperService>(TYPES.KinesisStreamWrapperService)
      .handleData(data, print);
  }
}
