import { OsDocument } from '../types/os-document';
import { UserAgentParser } from './user-agent.parser';
import { UAParser, IResult } from 'ua-parser-js';

jest.mock('ua-parser-js');

describe('UserAgentParser', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('matches using metadata', () => {
    const parser = new UserAgentParser();
    expect(parser.matches({ data: {} } as unknown as OsDocument)).toBe(false);
    expect(
      parser.matches({
        data: { '@metadata': { userAgent: true } },
      } as unknown as OsDocument),
    ).toBe(true);
  });

  it('undefined', () => {
    const parser = new UserAgentParser();
    const document = { data: {} } as unknown as OsDocument;
    parser.apply(document);
    expect(document).not.toHaveProperty('user_agent');
  });

  it('sets user agent', () => {
    jest.mocked(UAParser).mockImplementation(() => {
      return {
        getResult: jest.fn(() => ({
          browser: {
            name: 'jay',
            version: '2.0',
          },
          os: {
            name: 'walk',
            version: '2.0',
          },
          device: {
            model: 'stop',
          },
        })),
      } as unknown as IResult;
    });
    const parser = new UserAgentParser();
    const document = {
      data: {
        user_agent: {
          original: 'Something',
        },
      },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toEqual({
      user_agent: {
        original: 'Something',
        name: 'jay',
        version: '2.0',
        os: {
          name: 'walk',
          version: '2.0',
        },
        device: {
          name: 'stop',
        },
      },
    });
  });

  it('GoogleBot', () => {
    jest.mocked(UAParser).mockImplementation(() => {
      return {
        getResult: jest.fn(() => ({})),
      } as unknown as IResult;
    });
    const parser = new UserAgentParser();
    const document = {
      data: {
        user_agent: {
          original:
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
      },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(document.data).toEqual({
      user_agent: {
        original:
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        name: 'Googlebot',
      },
    });
  });

  it('YandexBot', () => {
    jest.mocked(UAParser).mockImplementation(() => {
      return {
        getResult: jest.fn(() => ({})),
      } as unknown as IResult;
    });
    const parser = new UserAgentParser();
    const document = {
      data: {
        user_agent: {
          original:
            'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
        },
      },
    } as unknown as OsDocument;
    parser.apply(document);
    expect(jest.mocked(UAParser)).toHaveBeenCalledTimes(1);
    expect(document.data).toEqual({
      user_agent: {
        original:
          'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
        name: 'YandexBot',
      },
    });
  });
});
