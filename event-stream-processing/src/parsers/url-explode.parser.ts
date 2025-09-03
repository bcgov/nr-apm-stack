import { injectable } from 'inversify';
import lodash from 'lodash';
import * as path from 'path';
import { format as formatUrl, URL } from 'url';
import { Parser } from '../types/parser';
import { OsDocument } from '../types/os-document';
import { ParserError } from '../util/parser.error';

const regexUrlWithProtocol = /^\w+:\/\//;
@injectable()
/**
 * Add exploded url to document
 */
export class UrlExplodeParser implements Parser {
  /**
   * Returns true if metadata field explodeHttpUrl is true.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return !!(
      document.data['@metadata'] && document.data['@metadata'].urlExplode
    );
  }

  /**
   * Add exploded url to document
   * @param document The document to modify
   */
  apply(document: OsDocument): void {
    const urlOriginal: string = lodash.get(document.data, 'url.original');

    // Do nothing if not set
    if (!urlOriginal) {
      return;
    }

    try {
      if (urlOriginal.startsWith('/')) {
        if (
          !lodash.isNil(lodash.get(document.data, 'url.scheme')) &&
          !lodash.isNil(lodash.get(document.data, 'url.domain')) &&
          !lodash.isNil(lodash.get(document.data, 'url.port'))
        ) {
          const url = new URL(
            `${lodash.get(document.data, 'url.scheme')}://${lodash.get(document.data, 'url.domain')}:${lodash.get(document.data, 'url.port')}${urlOriginal}`,
          );
          lodash.merge(document.data.url, this.explodeURL(url));
        } else {
          const url = new URL(`http://localhost:80${urlOriginal}`);
          lodash.merge(document.data.url, this.explodeURL(url));
          lodash.unset(document.data.url, 'scheme');
          lodash.unset(document.data.url, 'port');
          lodash.unset(document.data.url, 'domain');
          lodash.unset(document.data.url, 'full');
        }
      } else if (urlOriginal === '*' || urlOriginal === '%.') {
        // Do nothing
      } else if (regexUrlWithProtocol.exec(urlOriginal)) {
        lodash.merge(document.data.url, this.explodeURL(new URL(urlOriginal)));
      } else {
        lodash.merge(
          document.data.url,
          this.explodeURL(new URL(`http://${urlOriginal}`)),
        );
      }
    } catch (e: unknown) {
      throw new ParserError(
        `Could not parse [${urlOriginal}]`,
        'UrlExplodeParser',
      );
    }
  }

  private explodeURL(url: URL): any {
    const record: any = {};
    // URL.protocol always ends with ":"
    lodash.set(record, 'scheme', url.protocol.slice(0, -1));
    if (url.port.length > 0) {
      lodash.set(record, 'port', url.port);
    } else {
      if (url.protocol === 'http:' || url.protocol === 'ws:') {
        lodash.set(record, 'port', '80');
      } else if (url.protocol === 'https:' || url.protocol === 'wss:') {
        lodash.set(record, 'port', '443');
      } else if (url.protocol === 'ftp:') {
        lodash.set(record, 'port', '21');
      }
    }
    if (url.username.length > 0) {
      lodash.set(record, 'username', url.username);
    }
    if (url.password.length > 0) {
      lodash.set(record, 'password', '-');
    }
    lodash.set(record, 'domain', url.hostname);
    lodash.set(record, 'path', url.pathname);
    const fileName = path.basename(url.pathname);
    if (fileName.length > 0) {
      const extention = path.extname(fileName);
      if (extention !== '') {
        lodash.set(record, 'extension', extention);
      }
    }
    if (url.search.length > 0) {
      lodash.set(record, 'query', url.search.substring(1));
    }
    if (url.hash.length > 1) {
      lodash.set(record, 'fragment', url.hash.substring(1));
    }
    lodash.set(record, 'full', formatUrl(url, { auth: false }));
    return record;
  }
}
