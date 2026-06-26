import { FieldExtractorService } from '../shared/field-extractor.service';
import { OsDocument } from '../types/os-document';
import { HashParser } from './hash.parser';

describe('HashParser', () => {
  it('matches metadata field', () => {
    const parser = new HashParser(new FieldExtractorService());

    expect(
      parser.matches({
        data: { '@metadata': { hash: 'blah' } },
      } as unknown as OsDocument),
    ).toBe(true);
    expect(
      parser.matches({ data: { '@metadata': {} } } as unknown as OsDocument),
    ).toBe(false);
  });

  it('writes hash to event.hash (1)', () => {
    const service = new FieldExtractorService();
    jest.spyOn(service, 'fieldStringToArray');
    const parser = new HashParser(service);
    const document = {
      data: {
        event: { id: 'bob' },
        something: '12345',
        '@metadata': { hash: 'event.id,something' },
      },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(service.fieldStringToArray).toHaveBeenCalledTimes(1);
    expect(service.fieldStringToArray).toHaveBeenCalledWith(
      'event.id,something',
      document,
    );
    expect(document.data.event?.hash).toEqual(
      '106070a94974bd6ff8d70dd1198b5e95e629d894bd5b69e8dd63fdb0832538ac',
    );
  });

  it('writes hash to event.hash (2)', () => {
    const service = new FieldExtractorService();
    jest.spyOn(service, 'fieldStringToArray');
    const parser = new HashParser(service);
    const document = {
      data: {
        host: { hostname: 'backup' },
        log: { file: { name: 'wfappst.nrs.gov.bc.ca-access.2021.10.21.log' } },
        offset: 3850611,

        message:
          'v1.0 20120211 "https://wfappst.nrs.gov.bc.ca:443" "142.24.36.36" [21/Oct/2021:08:31:18 -0700] "POST /pub/dispatch-middleware/spring-remoting/organizationService HTTP/1.1" 200 2503 bytes 481 bytes "-" "Apache-HttpClient/4.5.1 (Java/1.8.0_191)" 1 ms, "TLSv1.2" "ECDHE-RSA-AES256-GCM-SHA384"',
        '@metadata': { hash: 'host.hostname,log.file.name,offset,message' },
      },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(service.fieldStringToArray).toHaveBeenCalledTimes(1);
    expect(service.fieldStringToArray).toHaveBeenCalledWith(
      'host.hostname,log.file.name,offset,message',
      document,
    );
    expect(document.data.event?.hash).toEqual(
      '169fd5fc785837cc08220f597b893c42bafcac188c5ad910210937bd2a5b7fa8',
    );
  });
});
