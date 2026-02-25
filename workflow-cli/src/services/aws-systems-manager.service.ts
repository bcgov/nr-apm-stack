import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import * as fs from 'fs';
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
  awsParameterVaultConfig: string;
}

interface Parameter {
  name: string;
  targets: { mount: string; path: string }[];
}

interface ParameterSecret {
  AccessKeyID: string;
  SecretAccessKey: string;
}

interface ParameterValue {
  current: ParameterSecret;
}

export default class AwsSystemsManagerService extends AwsService {
  constructor(
    @inject(TYPES.VaultApi)
    private vault: VaultApi,
  ) {
    super();
  }

  async retrieveParameters(region: string, names: string[]) {
    const client = new SSMClient(AwsService.configureClientProxy({ region }));
    const command = new GetParametersCommand({
      Names: names,
      WithDecryption: true,
    });
    return await client.send(command);
  }

  async syncParameters(settings: settings) {
    const parameters: Parameter[] = JSON.parse(
      fs.readFileSync(settings.awsParameterVaultConfig, 'utf-8'),
    );
    const response = await this.retrieveParameters(
      settings.region,
      parameters.map((p) => p.name),
    );

    if (!response.Parameters || response.Parameters.length === 0) {
      console.log('Parameters not found');
      return;
    }

    const nameToTargets: Record<string, { mount: string; path: string }[]> =
      parameters.reduce(
        (acc, p) => {
          acc[p.name] = p.targets;
          return acc;
        },
        {} as Record<string, { mount: string; path: string }[]>,
      );
    for (const parameter of response.Parameters) {
      const parameterValue = parameter.Value;
      if (parameterValue) {
        const targets = nameToTargets[parameter.Name!];
        const parameterVersion = String(parameter.Version);
        for (const target of targets) {
          const metadata = await this.vault.readKvMetadata(
            target.mount,
            target.path,
          );

          // Skip if the stored parameter version matches
          if (
            metadata?.data?.custom_metadata?.aws_ssm_parameter_version ===
            parameterVersion
          ) {
            console.log(
              `Skipping parameter ${parameter.Name} (version ${parameterVersion}) — vault already up to date at mount ${target.mount} and path ${target.path}`,
            );
            continue;
          }

          console.log(
            `Syncing parameter ${parameter.Name} (version ${parameterVersion}) to vault at mount ${target.mount} and path ${target.path}`,
          );
          const parameterValueObj: ParameterValue = JSON.parse(parameterValue);
          const dataToWrite = {
            data: {
              AWS_ACCESS_KEY_ID: parameterValueObj.current.AccessKeyID,
              AWS_SECRET_ACCESS_KEY: parameterValueObj.current.SecretAccessKey,
            },
          };
          if (metadata) {
            console.log(
              `Updating vault entry at mount ${target.mount} and path ${target.path} for parameter ${parameter.Name}`,
            );
            await this.vault.patch(
              `v1/${target.mount}/data/${target.path}`,
              dataToWrite,
            );
          } else {
            console.log(
              `Creating new vault entry at mount ${target.mount} and path ${target.path} for parameter ${parameter.Name}`,
            );
            await this.vault.write(
              `v1/${target.mount}/data/${target.path}`,
              dataToWrite,
            );
          }

          // Store the parameter version as custom metadata
          await this.vault.patchKvMetadata(target.mount, target.path, {
            aws_ssm_parameter_version: parameterVersion,
          });
        }
      }
    }
  }
}
