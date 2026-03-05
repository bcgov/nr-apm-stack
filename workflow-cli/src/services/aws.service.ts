/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpRequest } from '@smithy/protocol-http';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpsProxyAgent } from 'hpagent';

import { injectable } from 'inversify';
export interface settings {
  region: string;
  accessId: string;
  accessKey: string;
  roleArn?: string;
}

@injectable()
export default class AwsService {
  protected static identityAssumed = false;

  /**
   * Assume the identity required to make OpenSearch API requests
   * @param settings
   */
  public static async assumeIdentity(settings: settings): Promise<void> {
    const arnToAssume = settings.roleArn;
    if (!AwsService.identityAssumed && arnToAssume) {
      const stsClient1 = new STSClient(
        this.configureClientProxy({ region: settings.region }),
      );
      const stsAssumeRoleCommand = new AssumeRoleCommand({
        RoleArn: arnToAssume,
        RoleSessionName: 'nrdk',
      });
      const stsAssumedRole = await stsClient1.send(stsAssumeRoleCommand);
      if (stsAssumedRole && stsAssumedRole.Credentials) {
        // Overwrite the environment variables so later requests use assumed identity
        process.env.AWS_ACCESS_KEY_ID = stsAssumedRole.Credentials.AccessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY =
          stsAssumedRole.Credentials.SecretAccessKey;
        process.env.AWS_SESSION_TOKEN = stsAssumedRole.Credentials.SessionToken;
        AwsService.identityAssumed = true;
        console.log('Identity assumed');
      }
    }
  }

  protected async executeSignedHttpRequest(httpRequestParams: any) {
    const signedHttpRequest =
      await this.createSignedHttpRequest(httpRequestParams);
    const nodeHttpHandler = new NodeHttpHandler();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodeHttpHandler.handle(signedHttpRequest as any);
  }

  protected async waitAndReturnResponseBody(
    res: any,
    ignoreStatus: number[] = [],
  ) {
    return new Promise<{ statusCode: any; body: any }>((resolve, reject) => {
      const incomingMessage = res.response.body;
      let body = '';
      incomingMessage.on('data', (chunk: any) => {
        body += chunk;
      });
      incomingMessage.on('end', () => {
        if (
          res.response.statusCode >= 400 &&
          res.response.statusCode < 500 &&
          ignoreStatus.indexOf(res.response.statusCode) === -1
        ) {
          console.error(body);
        }
        resolve({ statusCode: res.response.statusCode, body });
      });
      incomingMessage.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  protected static configureClientProxy(client: any): any {
    if (process.env.HTTP_PROXY) {
      const agent = new HttpsProxyAgent({ proxy: process.env.HTTP_PROXY });
      client.requestHandler = new NodeHttpHandler({
        httpAgent: agent,
        httpsAgent: agent,
      });
    }
    return client;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createSignedHttpRequest(httpRequestParams: any) {
    const httpRequest = new HttpRequest(httpRequestParams);
    const sigV4Init = {
      credentials: defaultProvider(),
      region: process.env.AWS_DEFAULT_REGION || 'ca-central-1',
      service: 'es',
      sha256: Sha256,
    };
    const signer = new SignatureV4(sigV4Init);
    return signer.sign(httpRequest);
  }
}
