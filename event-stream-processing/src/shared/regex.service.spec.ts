import { RegexService } from './regex.service';
import { LoggerService } from '../util/logger.service';
import { OsDocument } from '../types/os-document';

const APACHE_ACCESS_LOG_EVENT_SIGNATURE = Object.freeze({
  event: Object.freeze({
    kind: 'event',
    category: 'web',
    dataset: 'apache.access',
    ingested: '2021-05-26T18:47:40.314-07:00',
    '@metadata': {
      apacheAccessLog: true,
    },
  }),
});

const regex_v1 =
  /^(?<labels__format>v1\.0) (?<service__version>[^ ]+) "(?<url__scheme>[^:]+):\/\/(?<url__domain>[^:]+):(?<url__port>\d+)" "(?<source__ip>[^"]+)" \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__request__bytes>(-?|\d+)) bytes (?<http__response__bytes>(-?|\d+)) bytes "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)" (?<event__duration>\d+) ms, "(?<tls__version_protocol>[^"]+)" "(?<tls__cipher>[^"]+)"$/;
const regex_apache_standard01 =
  /^(?<source__ip>[^ ]+) ([^ ]+) (?<user__name>[^ ]+) \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+)) "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)" (?<event__duration>(-?|\d+))$/;
const regex_apache_standard02 =
  /^(?<source__ip>[^ ]+) ([^ ]+) (?<user__name>[^ ]+) \[(?<extract_timestamp>[^\]]+)\] "(?<extract_httpRequest>([^"]|(?<=\\)")*)" (?<http__response__status_code>(-?|\d+)) (?<http__response__bytes>(-?|\d+)) "(?<http__request__referrer>([^"]|(?<=\\)")*)" "(?<user_agent__original>([^"]|(?<=\\)")*)"$/;
const regex_IIS_standard01 =
  /^(?<extract_timestamp>\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s((\S+)\s){3}(?<http__request__method>(\S+))\s(?<url__path>(\S+))\s(\S+)\s(?<url__port>(\S+))\s(?<extract_userName>(\S+))\s(?<source__ip>(-|\S+))\s(?<extract_httpVersion>(\S+))\s(?<user_agent__original>(\S+))\s((\S+)\s){2}(?<url__domain>(\S+))\s(?<http__response__status_code>(-|\d+))\s((-|\d+)\s){2}(?<http__request__bytes>(-|\d+))\s(?<http__response__bytes>(-|\d+))\s(?<event__duration>(-|\d+)).?$/;

const regexArr = [
  regex_v1,
  regex_apache_standard01,
  regex_apache_standard02,
  regex_IIS_standard01,
];

describe('RegexService', () => {
  const logger = {
    log: jest.fn(),
    debug: jest.fn(),
  } as LoggerService;

  it('parses suspicious entry - 001', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            'v1.0 20120211 "http://142.34.120.18:80" "64.114.237.115" [25/May/2021:15:53:10 -0700] "GET /WebID/IISWebAgentIF.dll?postdata=\\"><script>foo</script> HTTP/1.1" 302 347 bytes 1152 bytes "-" "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)" 1 ms, "-" "-"',
        }),
      ),
    } as unknown as OsDocument;
    const metaFields = parser.applyRegex(document, 'event.original', regexArr);

    expect(metaFields).toHaveProperty(
      'httpRequest',
      'GET /WebID/IISWebAgentIF.dll?postdata=\\"><script>foo</script> HTTP/1.1',
    );
    expect(document.data).toHaveProperty('event.duration', '1');
    expect(document.dataExtractedTimestamp).toBe('25/May/2021:15:53:10 -0700');
    expect(document.data).toHaveProperty('service.version', '20120211');
  });

  it('parses suspicious entry - 002', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            'v1.0 20120211 "http://142.34.120.21:80" "64.114.237.115" [25/May/2021:15:51:47 -0700] "GET /cgi-bin/count.cgi HTTP/1.1" 302 369 bytes 1043 bytes "-" "() { _; } >_[$($())] { echo Content-Type: text/plain ; echo ; echo \\"bash_cve_2014_6278 Output : $((10+12))\\"; }" 1 ms, "-" "-"',
        }),
      ),
    } as unknown as OsDocument;
    const metaFields = parser.applyRegex(document, 'event.original', regexArr);
    expect(metaFields).toHaveProperty(
      'httpRequest',
      'GET /cgi-bin/count.cgi HTTP/1.1',
    );
    expect(document.dataExtractedTimestamp).toBe('25/May/2021:15:51:47 -0700');
    expect(document.data).not.toHaveProperty('http.request.referrer');

    expect(document.data).toHaveProperty(
      'user_agent.original',
      '() { _; } >_[$($())] { echo Content-Type: text/plain ; echo ; echo \\"bash_cve_2014_6278 Output : $((10+12))\\"; }',
    );
    expect(document.data).toHaveProperty('event.duration', '1');
  });

  it('parses Apache standard format', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            '5.217.73.168 - - [05/Jun/2020:00:06:57 -0700] "GET /pub/eirs/viewDocumentDetail.do?fromStatic=true&repository=BDP&documentId=6612 HTTP/1.1" 200 277 "-" "AHC/2.1" 192',
        }),
      ),
    } as unknown as OsDocument;
    const metaFields = parser.applyRegex(document, 'event.original', regexArr);

    expect(metaFields).toHaveProperty(
      'httpRequest',
      'GET /pub/eirs/viewDocumentDetail.do?fromStatic=true&repository=BDP&documentId=6612 HTTP/1.1',
    );
    expect(document.dataExtractedTimestamp).toBe('05/Jun/2020:00:06:57 -0700');
    expect(document.data).toHaveProperty('source.ip', '5.217.73.168');
    expect(document.data).toHaveProperty('http.response.status_code', '200');
    expect(document.data).toHaveProperty('http.response.bytes', '277');
    expect(document.data).not.toHaveProperty('http.request.referrer');
    expect(document.data).toHaveProperty('user_agent.original', 'AHC/2.1');
    expect(document.data).toHaveProperty('event.duration');
  });

  it('parses Apache standard format - 2', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            '66.183.191.120 - - [05/Jun/2020:07:23:23 -0700] "GET /ext/raad3/map?execution=e1s1&_eventId=agreed HTTP/1.1" 302 - "https://apps.nrs.gov.bc.ca/ext/raad3/map?execution=e1s1" "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:77.0) Gecko/20100101 Firefox/77.0" 24',
        }),
      ),
    } as unknown as OsDocument;
    const metaFields = parser.applyRegex(document, 'event.original', regexArr);
    expect(document.data).not.toHaveProperty('user.name');
    expect(document.data).toHaveProperty('source.ip', '66.183.191.120');
    expect(metaFields).toHaveProperty(
      'httpRequest',
      'GET /ext/raad3/map?execution=e1s1&_eventId=agreed HTTP/1.1',
    );
    expect(document.data).not.toHaveProperty('http.response.bytes');
    expect(document.data).toHaveProperty('http.response.status_code', '302');

    expect(document.data).toHaveProperty(
      'http.request.referrer',
      'https://apps.nrs.gov.bc.ca/ext/raad3/map?execution=e1s1',
    );

    expect(document.data).toHaveProperty(
      'user_agent.original',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:77.0) Gecko/20100101 Firefox/77.0',
    );
    expect(document.data).toHaveProperty('event.duration');
    expect(document.dataExtractedTimestamp).toBe('05/Jun/2020:07:23:23 -0700');
  });

  it('keeps dash - 3', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            '66.183.191.120 - - [05/Jun/2020:07:23:23 -0700] "GET /ext/raad3/map?execution=e1s1&_eventId=agreed HTTP/1.1" 302 - "https://apps.nrs.gov.bc.ca/ext/raad3/map?execution=e1s1" "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:77.0) Gecko/20100101 Firefox/77.0" 24',
        }),
      ),
    } as unknown as OsDocument;
    parser.applyRegex(document, 'event.original', regexArr, false);
    expect(document.data).toHaveProperty('user.name', '-');
  });

  it('parses Windows IIS entry - 001', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            '2023-06-05 00:59:47 W3SVC14 Stress 142.34.2.162 GET /ftp/HTH/external/!publish/Web/publications/CPRT-Admin-Manual.pdf - 443 - 54.244.166.221 HTTP/1.1 Mozilla/5.0+(Windows+NT+10.0;+Win64;+x64)+AppleWebKit/537.36+(KHTML,+like+Gecko)+Chrome/105.0.0.0+Safari/537.36 - - testwww.for.gov.bc.ca 401 2 5 1558 270 93',
        }),
      ),
    } as unknown as OsDocument;
    const metaFields = parser.applyRegex(document, 'event.original', regexArr);
    expect(document.dataExtractedTimestamp).toBe('2023-06-05 00:59:47');
    expect(document.data).toHaveProperty('http.request.method', 'GET');

    expect(document.data).toHaveProperty(
      'url.path',
      '/ftp/HTH/external/!publish/Web/publications/CPRT-Admin-Manual.pdf',
    );
    expect(document.data).toHaveProperty('url.port', '443');
    expect(metaFields.httpVersion).toBe('HTTP/1.1');

    expect(document.data).toHaveProperty(
      'user_agent.original',
      'Mozilla/5.0+(Windows+NT+10.0;+Win64;+x64)+AppleWebKit/537.36+(KHTML,+like+Gecko)+Chrome/105.0.0.0+Safari/537.36',
    );
    expect(document.data).toHaveProperty('url.domain', 'testwww.for.gov.bc.ca');
    expect(document.data).toHaveProperty('http.response.status_code', '401');
    expect(document.data).toHaveProperty('http.request.bytes', '1558');
    expect(document.data).toHaveProperty('http.response.bytes', '270');
    expect(document.data).toHaveProperty('event.duration', '93');
  });
  it('parses Windows IIS entry - 002', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            '2023-06-05 01:33:04 W3SVC14 Stress 142.34.2.162 GET / - 443 - 65.49.20.69 HTTP/1.1 Mozilla/5.0+(Windows+NT+10.0;+rv:109.0)+Gecko/20100101+Firefox/109.0 - - 142.34.2.162 401 2 5 1539 156 140',
        }),
      ),
    } as unknown as OsDocument;
    const metaFields = parser.applyRegex(document, 'event.original', regexArr);
    expect(document.dataExtractedTimestamp).toBe('2023-06-05 01:33:04');
    expect(document.data).toHaveProperty('http.request.method', 'GET');

    expect(document.data).toHaveProperty('url.path', '/');
    expect(document.data).toHaveProperty('url.port', '443');
    expect(document.data).toHaveProperty('source.ip', '65.49.20.69');
    expect(metaFields.httpVersion).toBe('HTTP/1.1');

    expect(document.data).toHaveProperty(
      'user_agent.original',
      'Mozilla/5.0+(Windows+NT+10.0;+rv:109.0)+Gecko/20100101+Firefox/109.0',
    );
    expect(document.data).toHaveProperty('url.domain', '142.34.2.162');
    expect(document.data).toHaveProperty('http.response.status_code', '401');
    expect(document.data).toHaveProperty('http.request.bytes', '1539');
    expect(document.data).toHaveProperty('http.response.bytes', '156');
    expect(document.data).toHaveProperty('event.duration', '140');
  });
  it('parses Windows IIS entry - 003', () => {
    const parser = new RegexService(logger);

    const document = {
      data: JSON.parse(
        JSON.stringify({
          ...APACHE_ACCESS_LOG_EVENT_SIGNATURE,
          'event.original':
            '2023-06-22 00:00:21 W3SVC14 Stress 142.34.2.162 GET /hva/ecas/techdesign/Images/Interior_Log_Trans1.png - 443 IDIRJELINDLE 142.29.73.172 HTTP/1.1 Mozilla/5.0+(Windows+NT+10.0;+Win64;+x64)+AppleWebKit/537.36+(KHTML,+like+Gecko)+Chrome/114.0.0.0+Safari/537.36+Edg/114.0.1823.51 PS_TokenSite=https://chips.gov.bc.ca:7002/psp/CHIPSBC/?gbchrprd-7017-PORTAL-PSJSESSIONID;+SignOnDefault=;+SMSESSION=+U8u8/Pnsneg07Q3CG0VVx/uAt/dFrJPFsvk4ai3cYaDbh8U5W1jgfg4SilpQrW36BvugblWGGS2Q0ogsV8VLMH4UEmew5e+vIqqdeyTeKSq7vd/zAP2jLWpRLMnUYn28f/MaOqem5SNbC9g+S2hg8fh1MKq66Sj+uvQC4+QWW/KikBCLlyxZZMAT8ZySIBkbHvhTtlwFGO+BiLx0euTTXV9anA2o9rbR7UftBBbZzOELL0Tu1sThUf3ifmVaNyukqim2LYXmUl4acwcklfgrG2zPsxE/9kRHueopl8HDtUHfSEs/RFAQ9tU3dRpFcF7OIn3eTPJr05jBdh5YRyID7nikDaFhLvm6qwsEJPfxVTCQ207JpszcU8LSJRWJI8y1qVpS8aJq9G2h+EMT5KV3yfDZJvG7ydbtbyTngUe+i5dd0kvmDr1FjPnwIbT6aWoVtGAMhFbw5HoqeEaPyeGCNEKrWSPmBzf/sZoW35WRcD/9TxJCc/V1gYqDR4rFTGa09Ir6C7EkEn3S/41lp/+Wywl/ZWNnbrXMfhrJ0IZwxzakgtwMAxZI3oM3MxllBbSrXfMjcVVanwBrh1t6HCpIgZBtbcaXdyEYyS9mFbD3CYiqEd4dSx8Xa6Q/DEh1H6zJksH2MPzk98ReRQq5kvUEWGrCLV+2Taqn1XIgu2BYjmqRcoWCGKTQrC42dktEcSEP8m1whS2GYsTUvSnOkqPMIiz8lS2IzVmnXT4ccUziUgX8IcpADsJz/IWJG2vFOY6CnwxQSBwXu+TsM7CfTIRGHSj9QTU1tB9XzYIgXTJ7bF++u73wH6Mwkhox5wQXqrFSBlI7vR+6X9Y4SfhdwW7SWVepTBXBoyL4djMRYF0P6U64lerum4JB2qTeDO4c1sFRziT6j59gfH90Ot0h1SV99JeP7x1KG25x/I7IkrsZVT45SbXwQENXsKBeMn7v30xEsdlbw3uNdQRu8zY63MZ1EXAHAVzZebgBCjzr9IeLxtUr5ltLs+A3r/xCng5nQE6vFx+qeiOsOdwA8dZaoFVqkFBotQRDSsCOmVZG1j50lx/a0h5krDm8Jwkgf4RxY7XFmTh0mSfGPlcT6F2OXcOzAsY2VGBOA5PDIhXruM+OjqGvVZsxSY3jQcfrWTpfSB9O95X3QDWZl2+9dAmtPXJtG9CiQ5vXWF8D7jVDlAr2bTzOaAdyiG4dfS6rTdLAf/94S4KTVDMcjH6hhsb9+Pa3aOZCGiPy9+L;+gbchrprd-7017-PORTAL-PSJSESSIONID=jD_f7tPtYgG2wpXUQfP40XqMEj9rYvej!298189059 https://testwww.for.gov.bc.ca/hva/ecas/techdesign/interior_screens/interior_log_trans.htm testwww.for.gov.bc.ca 200 0 0 79186 2156 140',
        }),
      ),
    } as unknown as OsDocument;
    // eslint-enable max-len
    const metaFields = parser.applyRegex(document, 'event.original', regexArr);
    expect(document.dataExtractedTimestamp).toBe('2023-06-22 00:00:21');
    expect(document.data).toHaveProperty('http.request.method', 'GET');

    expect(document.data).toHaveProperty(
      'url.path',
      '/hva/ecas/techdesign/Images/Interior_Log_Trans1.png',
    );
    expect(document.data).toHaveProperty('url.port', '443');
    expect(metaFields.userName).toBe('IDIRJELINDLE');
    expect(document.data).toHaveProperty('source.ip', '142.29.73.172');
    expect(metaFields.httpVersion).toBe('HTTP/1.1');

    expect(document.data).toHaveProperty(
      'user_agent.original',
      'Mozilla/5.0+(Windows+NT+10.0;+Win64;+x64)+AppleWebKit/537.36+(KHTML,+like+Gecko)+Chrome/114.0.0.0+Safari/537.36+Edg/114.0.1823.51',
    );
    expect(document.data).toHaveProperty('url.domain', 'testwww.for.gov.bc.ca');
    expect(document.data).toHaveProperty('http.response.status_code', '200');
    expect(document.data).toHaveProperty('http.request.bytes', '79186');
    expect(document.data).toHaveProperty('http.response.bytes', '2156');
    expect(document.data).toHaveProperty('event.duration', '140');
  });
});
