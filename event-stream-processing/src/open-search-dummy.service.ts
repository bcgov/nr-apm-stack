import { inject, injectable } from 'inversify';
import { TYPES } from './inversify.types';
import { OpenSearchService } from './open-search.service';
import { OsDocument, OsDocumentPipeline } from './types/os-document';
import type { LoggerService } from './util/logger.service';

@injectable()
/**
 * Dummy service that echos back the data sent to it
 */
export class OpenSearchDummyService extends OpenSearchService {
  constructor(@inject(TYPES.LoggerService) logger: LoggerService) {
    super(logger);
  }

  /**
   * Echo back the documents for localhost testing
   * @param pipeline The pipeline containing documents that would have been uploaded
   * @returns The result containing info about the documents that would have been uploaded
   */
  async bulk(pipeline: OsDocumentPipeline): Promise<OsDocumentPipeline> {
    // Ensure documents have id and index
    const readyPipeline = this.preflightCheck(pipeline);

    // Refactor OsDocument to return fewer fields in result for clarity
    const compactDocs = readyPipeline.documents.map((document) => ({
      fingerprint: document.fingerprint.name,
      id: document.id,
      index: document.index,
      data: document.data,
    }));

    readyPipeline.documents = compactDocs as unknown as OsDocument[];

    return Promise.resolve(readyPipeline);
  }
}
