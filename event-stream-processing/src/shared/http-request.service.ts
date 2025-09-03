import { injectable } from 'inversify';
import lodash from 'lodash';
import { OsDocument } from '../types/os-document';

@injectable()
export class HttpRequestService {
  parse(document: OsDocument, httpRequest: string): void {
    let value = httpRequest.trim();

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
          const version = httpVersion.substring('HTTP/'.length);
          lodash.set(document.data, 'network.protocol.name', 'http');
          lodash.set(document.data, 'network.protocol.version', version);
          lodash.set(document.data, 'http.version', version);
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
        lodash.set(document.data, 'network.protocol.name', 'jsonrpc');
        try {
          const jsonBody = JSON.parse(value);
          if (!lodash.isNil(jsonBody.jsonrpc)) {
            lodash.set(
              document.data,
              'network.protocol.version',
              jsonBody.jsonrpc,
            );
          }
        } catch (e: unknown) {
          // Ignore JSON parse errors
        }
      }
    }
  }
}
