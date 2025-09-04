import { injectable } from 'inversify';
import lodash from 'lodash';
import { inject } from 'inversify';
import { Parser } from '../types/parser';
import { TYPES } from '../inversify.types';
import { OsDocument } from '../types/os-document';
import { RegexService } from '../shared/regex.service';

/* eslint-disable max-len,camelcase,@typescript-eslint/no-unsafe-call */
const regex_IIS_standard01 =
  /^(?<extract_timestamp>\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s((\S+)\s){3}(?<http__request__method>(\S+))\s(?<url__path>(\S+))\s(\S+)\s(?<url__port>(\S+))\s(?<extract_userName>(\S+))\s(?<source__ip>(-|\S+))\s(?<extract_httpVersion>(\S+))\s(?<extract_userAgent>(\S+))\s(?<extract_cookies>(\S+))\s(?<http__request__referrer>(\S+))\s(?<url__domain>(\S+))\s(?<http__response__status_code>(-|\d+))\s((-|\d+)\s){2}(?<http__request__bytes>(-|\d+))\s(?<http__response__bytes>(-|\d+))\s(?<event__duration>(-|\d+)).?$/;

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
export class IISParser implements Parser {
  /**
   * Constructor
   */
  constructor(@inject(TYPES.RegexService) private regexService: RegexService) {}

  /**
   * Returns true if metadata field iisAccessLog is true.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return !!(
      document.data['@metadata'] && document.data['@metadata'].iisAccessLog
    );
  }

  /**
   * Parse win iis access message into fields
   * @param document The document to modify
   */
  apply(document: OsDocument): void {
    // eslint-disable-next-line max-len
    const extractedFields = this.regexService.applyRegex(
      document,
      'event.original',
      [regex_IIS_standard01],
    );
    if (!lodash.isNil(extractedFields.httpVersion)) {
      const fullVerStr = extractedFields.httpVersion;
      if (fullVerStr.toUpperCase().startsWith('HTTP/')) {
        const version = fullVerStr.substring('HTTP/'.length);
        lodash.set(document.data, 'network.protocol.name', 'http');
        lodash.set(document.data, 'network.protocol.version', version);
        lodash.set(document.data, 'http.version', version);
      }
    }
    if (
      !lodash.isNil(extractedFields.userName) &&
      extractedFields.userName != '-'
    ) {
      const value = extractedFields.userName;
      const slashPos = value.indexOf('\\');
      if (slashPos > 0) {
        lodash.set(
          document.data,
          'user.name',
          value
            .substring(slashPos + 1)
            .trim()
            .toLowerCase(),
        );
        lodash.set(
          document.data,
          'user.id',
          value
            .substring(slashPos + 1)
            .trim()
            .toLowerCase() +
            '@' +
            value.substring(0, slashPos).toLowerCase(),
        );
      }
    }
    if (!lodash.isNil(extractedFields.userAgent)) {
      const userAgent = extractedFields.userAgent;
      lodash.set(
        document.data,
        'user_agent.original',
        userAgent.split('+').join(' '),
      );
    }
    if (!lodash.isNil(lodash.get(document.data, 'url.port'))) {
      switch (lodash.get(document.data, 'url.port')) {
        case '443':
          lodash.set(document.data, 'url.scheme', 'https');
          break;
        case '80':
          lodash.set(document.data, 'url.scheme', 'http');
          break;
        case '21':
          lodash.set(document.data, 'url.scheme', 'ftp');
          break;
        default:
          break;
      }
    }
    // replace cookies into '-' for event.original
    if (
      !lodash.isNil(extractedFields.cookies) &&
      extractedFields.cookies !== '-'
    ) {
      const origin_event_string = lodash.get(document.data, 'event.original');
      lodash.set(
        document.data,
        'event.original',
        origin_event_string.replace(extractedFields.cookies, '-'),
      );
    }
  }
}
