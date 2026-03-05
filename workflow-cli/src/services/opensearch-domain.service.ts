import {
  ElasticsearchServiceClient,
  DescribeElasticsearchDomainCommand,
} from '@aws-sdk/client-elasticsearch-service';
import { injectable } from 'inversify';
import AwsService from './aws.service';

export interface WorkflowSettings {
  hostname: string;
  domainName: string;
  region: string;
  accessId: string;
  accessKey: string;
  roleArn?: string;
  dryRun?: boolean;
}

@injectable()
export default class OpenSearchDomainService extends AwsService {
  public async getDomain(settings: WorkflowSettings): Promise<any> {
    const client = new ElasticsearchServiceClient(
      AwsService.configureClientProxy({ region: settings.region }),
    );
    return await this.waitForDomainStatusReady(client, settings.domainName);
  }

  private async describeDomain(
    client: ElasticsearchServiceClient,
    domainName: string,
  ): Promise<any> {
    const cmdParams = { DomainName: domainName };
    const cmd = new DescribeElasticsearchDomainCommand(cmdParams);
    try {
      const domainConfig = await client.send(cmd);
      return domainConfig;
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') return null;
      if (
        (error as any).errno === 'ENOTFOUND' &&
        (error as any).syscall === 'getaddrinfo'
      ) {
        return this.describeDomain(client, domainName);
      }
      console.dir(error, { depth: 5 });
    }
  }

  private async waitForDomainStatusReady(
    client: ElasticsearchServiceClient,
    domainName: string,
  ): Promise<any> {
    let cmdOutput = await this.describeDomain(client, domainName);
    while (
      cmdOutput.DomainStatus.Processing === true ||
      !cmdOutput.DomainStatus.Endpoint
    ) {
      await new Promise((r) => setTimeout(r, 5000));
      console.dir(cmdOutput);
      cmdOutput = await this.describeDomain(client, domainName);
    }
    return cmdOutput;
  }
}
