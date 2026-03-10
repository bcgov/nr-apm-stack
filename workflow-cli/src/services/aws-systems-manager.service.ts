import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import * as fs from 'fs';
import { inject } from 'inversify';
import AwsService from './aws.service';
import { TYPES } from '../inversify.types';
import VaultApi from '../vault/vault.api';

const AWS_PARAMETER_VERSION_METADATA_KEY_DEFAULT = 'aws_parameter_version';

export interface settings {
  region: string;
  accessId: string;
  accessKey: string;
  accountNumber: string;
  roleArn?: string;
  awsParameterVaultConfig: string;
}

interface ParameterTargetConfig {
  region?: string;
  roleArn?: string;
}

interface ParameterVaultConfig extends ParameterTargetConfig {
  metadata?: string;
  parameters: Parameter[];
}

interface ParameterTarget extends ParameterTargetConfig {
  mount: string;
  path: string;
}

interface Parameter {
  name: string;
  targets: ParameterTarget[];
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
    const config: ParameterVaultConfig = JSON.parse(
      fs.readFileSync(settings.awsParameterVaultConfig, 'utf-8'),
    );
    const parameters = config.parameters;
    const response = await this.retrieveParameters(
      settings.region,
      parameters.map((p) => p.name),
    );

    if (!response.Parameters || response.Parameters.length === 0) {
      console.log('Parameters not found');
      return;
    }

    const nameToTargets: Record<string, ParameterTarget[]> = parameters.reduce(
      (acc, p) => {
        acc[p.name] = p.targets;
        return acc;
      },
      {} as Record<string, ParameterTarget[]>,
    );
    for (const parameter of response.Parameters) {
      const parameterValue = parameter.Value;
      if (parameterValue) {
        const targets = nameToTargets[parameter.Name!];
        const parameterVersion = String(parameter.Version);
        for (const target of targets) {
          console.log(
            `Processing parameter ${parameter.Name} (version ${parameterVersion}) to vault at mount ${target.mount} and path ${target.path}`,
          );
          const metadata = await this.vault.readKvMetadata(
            target.mount,
            target.path,
          );

          // Skip if the stored parameter version matches
          if (
            metadata?.data?.custom_metadata?.[
              config.metadata || AWS_PARAMETER_VERSION_METADATA_KEY_DEFAULT
            ] === parameterVersion
          ) {
            console.log(
              `Skipping parameter ${parameter.Name} (version ${parameterVersion}): vault already up to date at mount ${target.mount} and path ${target.path}`,
            );
            continue;
          }

          const parameterValueObj: ParameterValue = JSON.parse(parameterValue);
          const data: Record<string, string> = {
            AWS_ACCESS_KEY_ID: parameterValueObj.current.AccessKeyID,
            AWS_SECRET_ACCESS_KEY: parameterValueObj.current.SecretAccessKey,
          };
          // Override region and roleArn if specified in the target config, otherwise use the global config values
          // If target is null, do not update the vault entry with region or roleArn.
          const region =
            target.region === null ? undefined : target.region || config.region;
          const roleArn =
            target.roleArn === null
              ? undefined
              : target.roleArn || config.roleArn;
          if (region) {
            data.AWS_DEFAULT_REGION = region;
          }
          if (roleArn) {
            data.AWS_ROLE_ARN = roleArn;
          }
          const dataToWrite = { data };
          const vaultDataPath = `v1/${target.mount}/data/${target.path}`;
          try {
            console.log(
              `Updating vault entry at mount ${target.mount} and path ${target.path} for parameter ${parameter.Name}`,
            );
            await this.vault.patch(vaultDataPath, dataToWrite);
          } catch (error: any) {
            if (error.response && error.response.status === 404) {
              console.log(
                `Creating new vault entry at mount ${target.mount} and path ${target.path} for parameter ${parameter.Name}`,
              );
              await this.vault.write(vaultDataPath, dataToWrite);
            } else {
              throw error;
            }
          }

          // Store the parameter version as custom metadata
          await this.vault.patchKvMetadata(target.mount, target.path, {
            [config.metadata || AWS_PARAMETER_VERSION_METADATA_KEY_DEFAULT]:
              parameterVersion,
          });
        }
      }
    }
  }
}
