import 'reflect-metadata';
import { Args, Command, Flags } from '@oclif/core';
import OpenSearchIndicesUsageService from '../services/opensearch-indicesusage.service';
import AwsService from '../services/aws.service';
import OpenSearchDomainService from '../services/opensearch-domain.service';
import {
  hostname,
  domainName,
  region,
  accessId,
  accessKey,
  accountNumber,
  roleArn,
} from '../flags';

const ACTION_SEARCH = '_search';

export default class OpensearchIndexUsage extends Command {
  static description = 'Index usage generator tool';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static args = {
    action: Args.string({
      name: 'action',
      required: true,
      description: 'Search indices usage',
      default: ACTION_SEARCH,
    }),
  };

  static flags = {
    ...hostname,
    ...domainName,
    ...region,
    ...accessId,
    ...accessKey,
    ...accountNumber,
    ...roleArn,
    indicesname: Flags.string({
      description: 'indices name',
      env: 'OS_USAGE_INDICES',
      required: true,
    }),
    fieldname: Flags.string({
      description: 'field name',
      env: 'OS_USAGE_FIELD',
      default: 'organization.id',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(OpensearchIndexUsage);
    await AwsService.assumeIdentity(flags);
    const service = new OpenSearchIndicesUsageService();
    const domainService = new OpenSearchDomainService();

    await domainService.getDomain(flags);
    if (args.action === ACTION_SEARCH) {
      await service.getIndicesUsage(flags);
    } else {
      throw new Error('Illegal action');
    }
  }
}
