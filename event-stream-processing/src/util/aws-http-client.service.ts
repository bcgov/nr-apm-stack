/* istanbul ignore file */
import { inject, injectable } from 'inversify';
import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { GenericError } from '../util/generic.error';
import type { LoggerService } from './logger.service';
import { TYPES } from '../inversify.types';
import { HttpMessage, URI } from '@smithy/types';

type HttpRequestOptions = Partial<HttpMessage> &
  Partial<URI> & {
    method?: string;
  };

export interface HttpResponseWrapper {
  response: HttpResponse;
}

export interface HttpBufferedResponse {
  statusCode: number;
  body: string;
}

@injectable()
export class AwsHttpClientService {
  constructor(@inject(TYPES.LoggerService) private logger: LoggerService) {}
  async executeSignedHttpRequest(
    httpRequestParams: HttpRequestOptions,
  ): Promise<{ response: HttpResponse }> {
    const signedHttpRequest =
      await this.createSignedHttpRequest(httpRequestParams);
    const nodeHttpHandler = new NodeHttpHandler();
    return nodeHttpHandler.handle(signedHttpRequest).catch((error) => {
      throw new GenericError('Error calling AWS endpoint', error);
    });
  }

  waitAndReturnResponseBody(res: {
    response: HttpResponse;
  }): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Received ${res.response.statusCode} from OS`);
      const incomingMessage = res.response.body;
      let body = '';
      incomingMessage.on('data', (chunk: any) => {
        body += chunk;
      });
      incomingMessage.on('end', () => {
        resolve({ statusCode: res.response.statusCode, body: body });
      });
      incomingMessage.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  private async createSignedHttpRequest(
    httpRequestParams: HttpRequestOptions,
  ): Promise<HttpRequest> {
    const httpRequest = new HttpRequest(httpRequestParams);
    const sigV4Init = {
      credentials: defaultProvider(),
      region: process.env.AWS_DEFAULT_REGION || 'ca-central-1',
      service: 'es',
      sha256: Sha256,
    };
    const signer = new SignatureV4(sigV4Init);
    return (await signer.sign(httpRequest)) as unknown as HttpRequest;
  }
}
