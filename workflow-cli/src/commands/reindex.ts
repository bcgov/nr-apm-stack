import 'reflect-metadata';
import { Command, Flags } from '@oclif/core';
import ReindexService from '../services/reindex.service';
import AwsService from '../services/aws.service';
import OpenSearchDomainService from '../services/opensearch-domain.service';
import {
  hostname,
  domainName,
  region,
  accessId,
  accessKey,
  roleArn,
} from '../flags';

export default class Reindex extends Command {
  static description = 'Bulk reindex runner';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...hostname,
    ...domainName,
    ...region,
    ...accessId,
    ...accessKey,
    ...roleArn,
    config: Flags.string({
      char: 'c',
      description: 'The configuration file name (without .json)',
      env: 'REINDEX_CONFIG_NAME',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Reindex);
    await AwsService.assumeIdentity(flags);

    const service = new ReindexService();
    const domainService = new OpenSearchDomainService();

    await domainService.getDomain(flags);
    await service.reindex(flags);
  }
}
