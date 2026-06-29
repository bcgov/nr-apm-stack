import { OsDocument } from '../types/os-document';
import { UrlExplodeParser } from './url-explode.parser';

describe('UrlExplodeParser', () => {
  it('matches using metadata', () => {
    const parser = new UrlExplodeParser();

    expect(
      parser.matches({
        data: { '@metadata': { urlExplode: true } },
      } as unknown as OsDocument),
    ).toBe(true);
    expect(
      parser.matches({ data: { '@metadata': {} } } as unknown as OsDocument),
    ).toBe(false);
  });

  it('do nothing if undefined', () => {
    const parser = new UrlExplodeParser();
    const document = { data: { url: {} } } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty('url');
  });

  it('url.original - 01', () => {
    const parser = new UrlExplodeParser();
    const document = {
      data: { url: { original: '/?XDEBUG_SESSION_START=phpstorm' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty(
      'url.original',
      '/?XDEBUG_SESSION_START=phpstorm',
    );
    expect(document.data).toHaveProperty('url.path', '/');
    expect(document.data).toHaveProperty(
      'url.query',
      'XDEBUG_SESSION_START=phpstorm',
    );
  });

  it('url.original - 02', () => {
    const parser = new UrlExplodeParser();
    const document = {
      data: { url: { original: '/?XDEBUG_SESSION_START=phpstorm#fragment' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty(
      'url.original',
      '/?XDEBUG_SESSION_START=phpstorm#fragment',
    );
    expect(document.data).toHaveProperty('url.path', '/');
    expect(document.data).toHaveProperty(
      'url.query',
      'XDEBUG_SESSION_START=phpstorm',
    );
  });

  it('url.original - 03', () => {
    const parser = new UrlExplodeParser();
    const document = {
      data: { url: { original: '/ext/jcrs/rest_v2/import?update=false' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty(
      'url.original',
      '/ext/jcrs/rest_v2/import?update=false',
    );
    expect(document.data).toHaveProperty(
      'url.path',
      '/ext/jcrs/rest_v2/import',
    );
    expect(document.data).toHaveProperty('url.query', 'update=false');
  });

  it('url.original - 04', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: {
        url: {
          original:
            '/ext/farm/farm265.do;jsessionid=JA6pko6NolLG_MPnJNoBbx75a-aAV9x99zjo0ECs1tH-VVS0waj4!1029141353',
        },
      },
    } as unknown as OsDocument;
    parser.apply(document);

    expect(document.data).toHaveProperty(
      'url.original',
      '/ext/farm/farm265.do;jsessionid=JA6pko6NolLG_MPnJNoBbx75a-aAV9x99zjo0ECs1tH-VVS0waj4!1029141353',
    );

    expect(document.data).toHaveProperty(
      'url.path',
      '/ext/farm/farm265.do;jsessionid=JA6pko6NolLG_MPnJNoBbx75a-aAV9x99zjo0ECs1tH-VVS0waj4!1029141353',
    );

    // expect(document.data).toHaveProperty('url.path_param', 'jsessionid=JA6pko6NolLG_MPnJNoBbx75a-aAV9x99zjo0ECs1tH-VVS0waj4!1029141353');
    expect(document.data).not.toHaveProperty('url.query');
  });

  it('url.original - 05', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: {
        url: {
          original:
            '/pub/oauth2/v1/oauth/token?disableDeveloperFilter=true&grant_type=client_credentials&scope=ACTIVEMQ.*',
        },
      },
    } as unknown as OsDocument;
    parser.apply(document);

    expect(document.data).toHaveProperty(
      'url.original',
      '/pub/oauth2/v1/oauth/token?disableDeveloperFilter=true&grant_type=client_credentials&scope=ACTIVEMQ.*',
    );
    expect(document.data).toHaveProperty(
      'url.path',
      '/pub/oauth2/v1/oauth/token',
    );

    expect(document.data).toHaveProperty(
      'url.query',
      'disableDeveloperFilter=true&grant_type=client_credentials&scope=ACTIVEMQ.*',
    );
  });

  it('url.original - 06', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: {
        url: {
          original:
            '/pub/oauth2/v1/oauth/token?disableDeveloperFilter=true&grant_type=client_credentials&scope=DSP.*',
        },
      },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty(
      'url.original',
      '/pub/oauth2/v1/oauth/token?disableDeveloperFilter=true&grant_type=client_credentials&scope=DSP.*',
    );
    expect(document.data).toHaveProperty(
      'url.path',
      '/pub/oauth2/v1/oauth/token',
    );
    expect(document.data).toHaveProperty(
      'url.query',
      'disableDeveloperFilter=true&grant_type=client_credentials&scope=DSP.*',
    );
  });
  it('url.original - 07', () => {
    const parser = new UrlExplodeParser();
    const document = {
      data: { url: { original: '/ext/farm/farm265.do;' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty(
      'url.original',
      '/ext/farm/farm265.do;',
    );
    expect(document.data).toHaveProperty('url.path', '/ext/farm/farm265.do;');
    // expect(document.data).not.toHaveProperty('url.path_param');
    expect(document.data).not.toHaveProperty('url.query');
  });
  it('url.original - 08', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: {
        url: {
          original:
            '/WebID/IISWebAgentIF.dll?postdata=\\"><script>foo</script>',
        },
      },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty(
      'url.path',
      '/WebID/IISWebAgentIF.dll',
    );
    // expect(document.data).not.toHaveProperty('url.path_param');
    expect(document.data).toHaveProperty(
      'url.query',
      'postdata=\\%22%3E%3Cscript%3Efoo%3C/script%3E',
    );
  });
  it('url.original - 09', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: { url: { original: '*' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).not.toHaveProperty('url.path');
    expect(document.data).toHaveProperty('url.original', '*');
  });
  it('url.original - 10', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: { url: { original: 'http://5.188.210.227/echo.php' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty('url.path', '/echo.php');
    expect(document.data).toHaveProperty(
      'url.original',
      'http://5.188.210.227/echo.php',
    );
  });
  it('url.original - 11', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: { url: { original: 'logontest7.gov.bc.ca:598' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty('url.path', '/');
    expect(document.data).toHaveProperty(
      'url.original',
      'logontest7.gov.bc.ca:598',
    );
    expect(document.data).toHaveProperty('url.domain', 'logontest7.gov.bc.ca');
    expect(document.data).toHaveProperty('url.port', '598');
  });
  it('url.original - 12', () => {
    const parser = new UrlExplodeParser();

    const document = {
      data: { url: { original: '/http://5.188.210.227/echo.php' } },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toHaveProperty(
      'url.path',
      '/http://5.188.210.227/echo.php',
    );
    expect(document.data).toHaveProperty(
      'url.original',
      '/http://5.188.210.227/echo.php',
    );
  });
});
