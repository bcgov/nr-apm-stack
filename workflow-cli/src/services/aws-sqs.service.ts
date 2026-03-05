import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  DeleteMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import AwsService from './aws.service';

export interface settings {
  domainName: string;
  region: string;
  accessId: string;
  accessKey: string;
  accountNumber: string;
  roleArn?: string;
}

export default class AwsSqsService extends AwsService {
  private client: SQSClient;
  constructor(settings: settings) {
    super();
    this.client = new SQSClient(
      AwsService.configureClientProxy({ region: settings.region }),
    );
  }

  public async receiveBatches(
    queueUrl: string,
    maxBatches: number,
    dryRun: boolean,
  ): Promise<any[]> {
    const batchedMessages: any[] = [];
    for (let i = 0; i < maxBatches; i++) {
      const messages = await this.receiveMessage(queueUrl, dryRun);
      if (messages.length === 0) {
        break;
      }
      batchedMessages.push(...messages);
    }
    return batchedMessages;
  }

  public async receiveMessage(
    queueUrl: string,
    dryRun: boolean,
  ): Promise<any[]> {
    const cmd = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
    });
    const messageArray = [];
    const sqsMessage = await this.client.send(cmd);
    if (sqsMessage.Messages) {
      for (const message of sqsMessage.Messages) {
        if (!message.Body) {
          continue;
        }
        const bodyContent = JSON.parse(message.Body);
        messageArray.push(JSON.parse(bodyContent.Message));
      }
      if (!dryRun) {
        const batchEntries: DeleteMessageBatchRequestEntry[] =
          sqsMessage.Messages.map((m) => m.ReceiptHandle)
            .filter((m): m is string => !!m)
            .map((m, index) => ({ Id: index.toString(), ReceiptHandle: m }));
        if (batchEntries.length > 0) {
          await this.client.send(
            new DeleteMessageBatchCommand({
              QueueUrl: queueUrl,
              Entries: batchEntries,
            }),
          );
        }
      }
    }
    return messageArray;
  }
}
