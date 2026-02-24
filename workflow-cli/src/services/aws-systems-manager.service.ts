import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { inject } from 'inversify';
import AwsService from './aws.service';
import { TYPES } from '../inversify.types';
import VaultApi from '../vault/vault.api';

export interface settings {
  region: string;
  accessId: string;
  accessKey: string;
  accountNumber: string;
  arn: string | undefined;
}

const parameters = [
  {
    name: '/iam_users/b03a55-dev-apm-iam-user-rotator_keys',
    targets: [
      {
        mount: 'apps',
        path: 'prod/fluent/fluent-bit',
      },
    ],
  },
];

export default class AwsSystemsManagerService extends AwsService {
  constructor(
    @inject(TYPES.VaultApi)
    private vault: VaultApi,
  ) {
    super();
  }

  async syncParameters(settings: settings) {
    const client = new SSMClient(
      AwsService.configureClientProxy({ region: settings.region }),
    );
    const command = new GetParametersCommand({
      Names: parameters.map((p) => p.name),
      WithDecryption: false,
    });
    const nameToTargets: Record<string, { mount: string; path: string }[]> = {};
    parameters.forEach((p) => {
      nameToTargets[p.name] = p.targets;
    });
    const response = await client.send(command);
    if (response.Parameters && response.Parameters.length > 0) {
      for (const parameter of response.Parameters) {
        const parameterValue = parameter.Value;
        if (parameterValue) {
          const targets = nameToTargets[parameter.Name!];
          for (const target of targets) {
            console.log(
              `Syncing parameter ${parameter.Name} to vault at mount ${target.mount} and path ${target.path}`,
            );
            const value = await this.vault.read(
              `${target.mount}/metadata/${target.path}`,
            );
            if (value.data) {
              await this.vault.patch(`${target.mount}/data/${target.path}`, {
                data: {
                  ...value.data.data,
                  parameterValue,
                },
              });
            } else {
              await this.vault.write(`${target.mount}/data/${target.path}`, {
                data: {
                  parameterValue,
                },
              });
            }
          }
        }
      }
    } else {
      console.log('Parameter not found');
    }
  }
}
