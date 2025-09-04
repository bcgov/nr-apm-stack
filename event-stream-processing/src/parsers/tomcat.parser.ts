import { injectable, inject } from 'inversify';
import lodash from 'lodash';
import { Parser } from '../types/parser';
import { TYPES } from '../inversify.types';
import { OsDocument } from '../types/os-document';
import { RegexService } from '../shared/regex.service';
import { HttpRequestService } from '../shared/http-request.service';

const regex_tomcat_localhost_access =
  /^(?<source__ip>[^ ]+) - - \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+))$/;

/**
 * reference:
 * - https://github.com/elastic/beats/tree/master/filebeat/module/apache/access
 * - https://www.josephkirwin.com/2016/03/12/nodejs_redos_mitigation/
 *
 * Tag: Standard format
 */
@injectable()
/**
 * Parse tomcat message into fields
 */
export class TomcatParser implements Parser {
  /**
   * Constructor
   * @param regexService
   */
  constructor(
    @inject(TYPES.RegexService) private regexService: RegexService,
    @inject(TYPES.HttpRequestService)
    private httpRequestService: HttpRequestService,
  ) {}

  /**
   * Returns true if metadata field tomcatLog is true.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return !!(
      document.data['@metadata'] && document.data['@metadata'].tomcatLog
    );
  }

  /**
   * Parse apache message into fields
   * @param document The document to modify
   */
  apply(document: OsDocument): void {
    const extractedFields = this.regexService.applyRegex(
      document,
      'event.original',
      [regex_tomcat_localhost_access],
    );

    if (!lodash.isNil(extractedFields.httpRequest)) {
      this.httpRequestService.parse(document, extractedFields.httpRequest);
    }
  }
}
