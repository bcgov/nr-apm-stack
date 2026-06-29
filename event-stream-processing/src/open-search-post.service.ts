import { injectable, inject } from 'inversify';
import { URL } from 'url';
import { TYPES } from './inversify.types';
import { OpenSearchService } from './open-search.service';

import {
  OsDocument,
  OsDocumentCommitFailure,
  OsDocumentPipeline,
} from './types/os-document';
import { AwsHttpClientService } from './util/aws-http-client.service';
import type { LoggerService } from './util/logger.service';

@injectable()
/**
 * Service to post bulk data to OpenSearch
 */
export class OpenSearchPostService extends OpenSearchService {
  private url: URL = new URL(process.env.ES_URL || 'http://localhost');

  constructor(
    @inject(TYPES.AwsHttpClientService)
    private awsHttpClient: AwsHttpClientService,
    @inject(TYPES.LoggerService) logger: LoggerService,
  ) {
    super(logger);
  }

  /**
   * Upload a bulk set of documents from the pipeline
   * @param pipeline The pipeline with documents to upload
   */
  async bulk(pipeline: OsDocumentPipeline): Promise<OsDocumentPipeline> {
    const index = new Map<string, OsDocument>();
    const filterPath = 'took,errors,items.*.error,items.*._id';
    let body = '';
    // Ensure documents have id and index
    const readyPipeline = this.preflightCheck(pipeline);
    for (const document of readyPipeline.documents) {
      if (document.id === null || document.index === null) {
        // This should never happen because of the preflight check
        continue;
      }
      index.set(document.id, document);
      body += `{"index":{"_index": "${document.index}"`;
      if (document.id) {
        body += `, "_id":"${document.id}"`;
      }
      body += `}}\n`;
      body += JSON.stringify(document.data) + '\n';
    }
    const query: {
      refresh: string;

      filter_path?: string;
    } = { refresh: 'wait_for' };
    if (filterPath.length > 0) {
      query.filter_path = filterPath;
    }
    this.logger.debug(`${index.size} documents being posted to OS`);
    this.logger.debug('ES_REQUEST_BODY:', body);
    this.logger.debug('ES_REQUEST_QUERY:', query);
    if (body.length === 0) {
      return Promise.resolve(readyPipeline);
    }
    return await this.awsHttpClient
      .executeSignedHttpRequest({
        hostname: this.url.hostname,
        protocol: 'https',
        method: 'POST',
        body: body,
        headers: {
          'Content-Type': 'application/x-ndjson',
          host: this.url.hostname,
        },
        query: query,
        path: '/_bulk',
      })
      .then(
        this.awsHttpClient.waitAndReturnResponseBody.bind(this.awsHttpClient),
      )
      .then((value: any) => {
        if (value.statusCode !== 200) {
          this.logger.log(`ES_RESPONSE_STATUS_CODE ${value.statusCode}`);
          return {
            documents: [],
            failures: [
              ...readyPipeline.documents.map((doc) =>
                this.createCommitFailure('ES_NETWORK', doc, 'Network down?'),
              ),
              ...readyPipeline.failures,
            ],
          };
        }
        const body = JSON.parse(value.body);
        const bodyItems: any[] = body.items;
        this.logger.debug('ES_RESPONSE_BODY:', value.body);
        for (const item of bodyItems) {
          const meta = item.create || item.index;
          if (meta.error) {
            const document = index.get(meta._id);
            if (document) {
              const message =
                (typeof meta.error.type === 'string'
                  ? (meta.error.type as string)
                  : 'Unknown') +
                `: ${typeof meta.error.reason === 'string' ? (meta.error.reason as string) : 'Unknown'}`;

              readyPipeline.failures.push(
                this.createCommitFailure('ES_DOCERROR', document, message),
              );
              index.delete(meta._id);
            } else {
              this.logger.log('ES_ERROR_DOC_NOT_FOUND ' + JSON.stringify(item));
            }
          }
        }
        return {
          documents: Array.from(index.values()),
          failures: readyPipeline.failures,
        };
      });
  }

  private createCommitFailure(
    type: string,
    document: OsDocument,
    message: string,
  ): OsDocumentCommitFailure {
    const docErrorMsg = this.createErrorMessage(type, document, message);
    this.logger.debug(docErrorMsg);
    this.logger.debug('ES_ERROR ' + JSON.stringify(document.data));
    return new OsDocumentCommitFailure(document, docErrorMsg);
  }
}
