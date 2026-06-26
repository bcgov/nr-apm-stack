import { injectable } from 'inversify';

import {
  OsDocument,
  OsDocumentCommitFailure,
  OsDocumentPipeline,
  OsDocumentProcessingFailure,
} from './types/os-document';
import type { LoggerService } from './util/logger.service';
import {
  buildOsDocumentPipeline,
  partitionObjectInPipeline,
} from './util/pipeline.util';
export interface ResultItem {
  _id: string;
  error?: any;
}
export interface ResultOperation {
  create: ResultItem;
}

/**
 * Service to post bulk data to OpenSearch
 */
@injectable()
export abstract class OpenSearchService {
  /**
   * Upload a bulk set of documents from the pipeline
   * @param pipeline The pipeline with documents to upload
   */
  abstract bulk(pipeline: OsDocumentPipeline): Promise<OsDocumentPipeline>;

  constructor(protected logger: LoggerService) {}

  /**
   * Do a preflight check with pipeline for lack of index or id
   * @param pipeline The pipeline to check
   * @returns A pipeline with documents that are ready to be sent
   */
  public preflightCheck(pipeline: OsDocumentPipeline): OsDocumentPipeline {
    return pipeline.documents
      .map((document) => {
        if (document.id === null) {
          return this.createProcessingFailure(
            'ES_ERROR',
            document,
            'Document with no id',
          );
        }
        if (document.index === null) {
          return this.createProcessingFailure(
            'ES_ERROR',
            document,
            'Document with no index',
          );
        }
        return document;
      })
      .reduce(partitionObjectInPipeline, buildOsDocumentPipeline(pipeline));
  }

  /**
   * Create an error message
   * @param type The general type
   * @param document The document the error is for
   * @param message A human-readable text message
   * @returns The error message
   */
  protected createErrorMessage(
    type: string,
    document: OsDocument,
    message: string,
  ): string {
    const team: string = document.data.organization?.id
      ? document.data.organization.id
      : 'unknown';
    const hostName: string = document.data.host?.hostname
      ? (document.data.host?.hostname as string)
      : '';
    const serviceName: string = document.data.service?.name
      ? document.data.service?.name
      : '';
    const sequence: string = document.data.event?.sequence
      ? document.data.event?.sequence
      : '';
    const path: string = document.data.log?.file?.path
      ? document.data.log?.file?.path
      : '';

    return `${type} ${team} ${hostName} ${serviceName} ${path}:${sequence} ${document.fingerprint.name} : ${message}`;
  }

  private createProcessingFailure(
    type: string,
    document: OsDocument,
    message: string,
  ): OsDocumentCommitFailure {
    const docErrorMsg = this.createErrorMessage(type, document, message);
    this.logger.debug(docErrorMsg);
    this.logger.debug('ES_ERROR ' + JSON.stringify(document.data));
    return new OsDocumentProcessingFailure(document, docErrorMsg);
  }
}
