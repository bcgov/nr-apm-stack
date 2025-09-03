import { HttpRequestService } from '../shared/http-request.service';
import { RegexService } from '../shared/regex.service';
import { OsDocument } from '../types/os-document';
import { ApacheParser } from './apache.parser';

describe('ApacheParser', () => {
  it('matches using metadata', () => {
    const parser = new ApacheParser(
      {} as unknown as RegexService,
      new HttpRequestService(),
    );

    expect(
      parser.matches({
        data: { '@metadata': { apacheAccessLog: true } },
      } as unknown as OsDocument),
    ).toBe(true);
    expect(
      parser.matches({ data: { '@metadata': {} } } as unknown as OsDocument),
    ).toBe(false);
  });

  it('calls regexService.applyRegex when apply called', () => {
    const service = {
      applyRegex: jest.fn().mockReturnValue({}),
    } as unknown as RegexService;
    const parser = new ApacheParser(service, new HttpRequestService());
    const testDoc = {} as unknown as OsDocument;

    parser.apply(testDoc);

    expect(service.applyRegex).toHaveBeenCalledWith(
      testDoc,
      'event.original',
      expect.any(Array),
    );
    expect(service.applyRegex).toHaveBeenCalledTimes(1);
  });

  it('should parse a standard HTTP request line', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const regexService = new RegexService({ debug: () => {} } as any);
    const parser = new ApacheParser(regexService, new HttpRequestService());
    const doc: OsDocument = {
      data: {
        '@metadata': { apacheAccessLog: true },
        event: {
          original:
            '127.0.0.1 - - [01/Sep/2025:10:00:00 -0700] "GET /foo HTTP/1.1" 200 123 "-" "curl/7.68.0" 5',
        },
      },
    } as unknown as OsDocument;

    parser.apply(doc);

    expect(doc.data.http?.request?.method).toBe('GET');
    expect(doc.data.url?.original).toBe('/foo');
    expect(doc.data.http?.version).toBe('1.1');
    expect(doc.data.http?.request?.body).toBeUndefined();
  });

  it('should parse a JSON-RPC body', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const regexService = new RegexService({ debug: () => {} } as any);
    const parser = new ApacheParser(regexService, new HttpRequestService());
    const doc: OsDocument = {
      data: {
        '@metadata': { apacheAccessLog: true },
        event: {
          original:
            'v1.0 20120211 "https://142.34.217.234:443" "152.32.189.121" [01/Sep/2025:05:41:17 -0700] "{\\"id\\":1,\\"jsonrpc\\":\\"2.0\\",\\"method\\":\\"login\\",\\"params\\":{\\"param1\\":\\"blue1\\",\\"param2\\":\\"none\\",\\"agent\\":\\"Windows NT 6.1; Win64; x64\\"}}\\n" 400 482 bytes 6141 bytes "-" "-" 0 ms, "TLSv1.2" "ECDHE-RSA-AES256-GCM-SHA384"',
        },
      },
    } as unknown as OsDocument;

    parser.apply(doc);

    expect(doc.data.http?.request?.method).toBeUndefined();
    expect(doc.data.http?.request?.body?.content).toBe(
      '{"id":1,"jsonrpc":"2.0","method":"login","params":{"param1":"blue1","param2":"none","agent":"Windows NT 6.1; Win64; x64"}}\n',
    );
    expect(doc.data.network?.protocol?.name).toBe('jsonrpc');
    expect(doc.data.network?.protocol?.version).toBe('2.0');
  });
});
