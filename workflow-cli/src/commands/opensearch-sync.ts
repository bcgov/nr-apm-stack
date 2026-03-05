import 'reflect-metadata';
import { Command } from '@oclif/core';
import AwsService from '../services/aws.service';
import { bindBroker, bindVault, vsContainer } from '../inversify.config';
import {
  accessId,
  accessKey,
  accountNumber,
  roleArn,
  brokerApiUrl,
  brokerToken,
  domainName,
  help,
  hostname,
  region,
  vaultAddr,
  vaultToken,
} from '../flags';
import OpenSearchController from '../controller/opensearch.controller';
import { TYPES } from '../inversify.types';

export default class OpenSearchSync extends Command {
  static description = 'Sync OpenSearch settings';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...hostname,
    ...domainName,
    ...region,
    ...accessId,
    ...accessKey,
    ...accountNumber,
    ...roleArn,
    ...brokerApiUrl,
    ...brokerToken,
    ...vaultAddr,
    ...vaultToken,
    ...help,
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(OpenSearchSync);

    await AwsService.assumeIdentity(flags);

    bindBroker(flags['broker-api-url'], flags['broker-token']);
    bindVault(flags['vault-addr'], flags['vault-token']);

    await vsContainer
      .get<OpenSearchController>(TYPES.OpenSearchController)
      .sync(flags);
  }
}
