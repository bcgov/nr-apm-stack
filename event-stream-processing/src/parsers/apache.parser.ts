import { injectable } from 'inversify';
import lodash from 'lodash';
import { Parser } from '../types/parser';
import { inject } from 'inversify';
import { TYPES } from '../inversify.types';
import { OsDocument } from '../types/os-document';
import { RegexService } from '../shared/regex.service';

/* eslint-disable max-len,camelcase,@typescript-eslint/no-unsafe-call */
const regex_v1 =
  /^(?<extract_format>v1\.0) (?<service__version>[^ ]+) "(?<url__scheme>[^:]+):\/\/(?<url__domain>[^:]+):(?<url__port>\d+)" "(?<source__ip>[^"]+)" \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>.*?)(?<!\\)" (?<http__response__status_code>(-?|\d+)) (?<http__request__bytes>(-?|\d+)) bytes (?<http__response__bytes>(-?|\d+)) bytes "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)" (?<event__duration>\d+) ms, "(?<tls__version_protocol>[^"]+)" "(?<tls__cipher>[^"]+)"$/;
const regex_apache_standard01 =
  /^(?<source__ip>[^ ]+) ([^ ]+) (?<user__name>[^ ]+) \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+)) "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)" (?<event__duration>(-?|\d+))$/;
const regex_apache_standard02 =
  /^(?<source__ip>[^ ]+) ([^ ]+) (?<user__name>[^ ]+) \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+)) "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)"$/;
/* eslint-enable max-len */

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
export class ApacheParser implements Parser {
  /**
   * Constructor
   */
  constructor(@inject(TYPES.RegexService) private regexService: RegexService) {}

  /**
   * Returns true if metadata field apacheAccessLog is true.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return !!(
      document.data['@metadata'] && document.data['@metadata'].apacheAccessLog
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
      [regex_v1, regex_apache_standard01, regex_apache_standard02],
    );

    if (!lodash.isNil(extractedFields.httpRequest)) {
      let value = extractedFields.httpRequest.trim();

      // Case 1: Looks like a normal HTTP request line
      if (/^[A-Z]+\s+.+\s+HTTP\/\d/.test(value)) {
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
      } else {
        // Case 2: Not an HTTP request line. Treat as body
        value = value.replace(/\\"/g, '"').replace(/\\n/g, '\n');

        lodash.set(document.data, 'http.request.body.content', value);
        // Optional: detect JSON-RPC
        if (value.startsWith('{') && value.includes('"jsonrpc"')) {
          lodash.set(document.data, 'network.protocol', 'rpc');
          lodash.set(document.data, 'network.application', 'jsonrpc');
        }
      }
    }
  }
}
