import 'reflect-metadata';
import { Command, Flags } from '@oclif/core';
import AwsSqsService from '../services/aws-sqs.service';
import AwsService from '../services/aws.service';
import {
  hostname,
  domainName,
  region,
  accessId,
  accessKey,
  accountNumber,
  roleArn,
  dryRun,
} from '../flags';

export default class AutomationMessage extends Command {
  static description = 'Automation message receive tool';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...hostname,
    ...domainName,
    ...region,
    ...accessId,
    ...accessKey,
    ...accountNumber,
    ...roleArn,
    ...dryRun,
    maxBatches: Flags.integer({
      description: 'Number of times to request batch of messages',
      env: 'AWS_SQS_MAX_BATCH_COUNT',
      min: 1,
      max: 100,
      default: 10,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(AutomationMessage);
    const queueUrl = `https://sqs.${flags.region}.amazonaws.com/${flags.accountNumber}/${flags.domainName}-message-queue`;

    await AwsService.assumeIdentity(flags);
    const service = new AwsSqsService(flags);
    const message = await service.receiveBatches(
      queueUrl,
      flags.maxBatches,
      flags.dryRun,
    );
    console.log(JSON.stringify(message));
  }
}
