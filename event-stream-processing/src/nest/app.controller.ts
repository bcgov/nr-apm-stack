import { Body, Controller, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
/**
 * Generic NestJS app controller.
 */
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  /**
   * Handle data received as a mock Kinesis event.
   */
  async handleData(
    @Body() bodyData: unknown,
    @Query('print') print: string,
  ): Promise<void> {
    const dataArr = bodyData instanceof Array ? bodyData : [bodyData];

    await Promise.all(
      dataArr.map((data) =>
        this.appService.handleKinesisEvent(data, print === 'true'),
      ),
    );
    return;
  }
}
