import 'reflect-metadata';
import { Args, Command } from '@oclif/core';
import OpenSearchSnapshotService from '../services/opensearch-snapshot.service';
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

const ACTION_SETUP = 'setup';
const ACTION_CREATE = 'create';

export default class Snapshot extends Command {
  static description = 'Snapshot setup and creation tool';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static args = {
    action: Args.string({
      name: 'action',
      required: true,
      description: 'Snapshot action',
      default: ACTION_CREATE,
      options: [ACTION_SETUP, ACTION_CREATE],
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
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Snapshot);
    await AwsService.assumeIdentity(flags);
    const service = new OpenSearchSnapshotService();
    const domainService = new OpenSearchDomainService();

    await domainService.getDomain(flags);
    if (args.action === ACTION_SETUP) {
      await service.setupSnapshot(flags);
    } else if (args.action === ACTION_CREATE) {
      await service.createSnapshot(flags);
    } else {
      throw new Error('Illegal action');
    }
  }
}
