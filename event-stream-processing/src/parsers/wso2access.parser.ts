import { injectable } from 'inversify';
import { Parser } from '../types/parser';
import { inject } from 'inversify';
import { TYPES } from '../inversify.types';
import { OsDocument } from '../types/os-document';
import { RegexService } from '../shared/regex.service';
import lodash from 'lodash';

const regex_wso2_v1 =
  /[^ ]+ (?<source__ip>.+[^ ]+) .+- \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+)) "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)"$/;
const regex_wso2_v2 =
  /^(?<source__ip>([^ ]+)) [^ ]+ - (-?|[^ ]+) \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+)) "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)"$/;
const regex_wso2_v3 =
  /^(?<source__ip>([^ ]+)) - (-?|[^ ]+) \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+)) "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)"$/;

/**
 * reference:
 * - https://github.com/elastic/beats/tree/master/filebeat/module/apache/access
 * - https://www.josephkirwin.com/2016/03/12/nodejs_redos_mitigation/
 *
 * Tag: Standard format
 */
@injectable()
/**
 * Parse apache message into fields
 */
export class Wso2AccessParser implements Parser {
  /**
   * Constructor
   */
  constructor(@inject(TYPES.RegexService) private regexService: RegexService) {}

  /**
   * Returns true if metadata field Wso2AccessLog is true.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return !!(
      document.data['@metadata'] && document.data['@metadata'].wso2AccessLog
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
      [regex_wso2_v1, regex_wso2_v2, regex_wso2_v3],
    );

    if (!lodash.isNil(extractedFields.httpRequest)) {
      const value = extractedFields.httpRequest;
      const firstSpace = value.indexOf(' ');
      const lastSpace = value.lastIndexOf(' ');
      if (firstSpace > 0 && lastSpace > firstSpace) {
        const httpVersion = value.substring(lastSpace).trim();
        lodash.set(
          document.data,
          'http.request.method',
          value.substring(0, firstSpace),
        );
        if (httpVersion.toUpperCase().startsWith('HTTP/')) {
          lodash.set(
            document.data,
            'http.version',
            httpVersion.substring('HTTP/'.length),
          );
        }
        const uriOriginal: string = value
          .substring(firstSpace, lastSpace)
          .trim();
        lodash.set(document.data, 'url.original', uriOriginal);
      }
    }
  }
}
