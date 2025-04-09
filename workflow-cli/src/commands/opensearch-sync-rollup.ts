import 'reflect-metadata';
import { Command } from '@oclif/core';
import AwsService from '../services/aws.service';
import {
  accessId,
  accessKey,
  accountNumber,
  arn,
  domainName,
  help,
  hostname,
  region,
  dryRun,  
} from '../flags';
import OpenSearchRollupService from '../services/opensearch-rollup.service';
import OpenSearchDomainService from '../services/opensearch-domain.service';

export default class OpenSearchRollup extends Command {
  static description = 'Create/Update OpenSearch Rollup Index';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...hostname,
    ...domainName,
    ...region,
    ...accessId,
    ...accessKey,
    ...accountNumber,
    ...arn,
    ...help,
    ...dryRun,
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(OpenSearchRollup);
    await AwsService.assumeIdentity(flags);

    const service = new OpenSearchRollupService();
    const domainService = new OpenSearchDomainService();
  
    await domainService.getDomain(flags);
    await service.createOrUpdateRollupJob(flags);
  }
}
