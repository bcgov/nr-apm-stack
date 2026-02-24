import 'reflect-metadata';
import { Command } from '@oclif/core';
import { bindVault, vsContainer } from '../inversify.config';
import { TYPES } from '../inversify.types';
import AwsService from '../services/aws.service';
import {
  region,
  accessId,
  accessKey,
  accountNumber,
  arn,
  vaultAddr,
  vaultToken,
  help,
} from '../flags';
import AwsSystemsManagerService from '../services/aws-systems-manager.service';

export default class IamKeyRotation extends Command {
  static description = 'IAM key rotation tool';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...region,
    ...accessId,
    ...accessKey,
    ...accountNumber,
    ...arn,
    ...vaultAddr,
    ...vaultToken,
    ...help,
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(IamKeyRotation);

    await AwsService.assumeIdentity(flags);
    bindVault(flags['vault-addr'], flags['vault-token']);

    await vsContainer.get<AwsSystemsManagerService>(TYPES.AwsSystemsManagerService).syncParameters(flags);
  }
}
