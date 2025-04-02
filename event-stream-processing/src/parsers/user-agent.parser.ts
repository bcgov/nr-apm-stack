import { injectable } from 'inversify';
import { Parser } from '../types/parser';
import { UAParser } from 'ua-parser-js';
import { OsDocument } from '../types/os-document';
import cleanDeep from 'clean-deep';

@injectable()
/**
 * Parses the user_agent string into user readable fields
 * Tag: Support
 */
export class UserAgentParser implements Parser {
  /**
   * Returns true if metadata field userAgent is true.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return !!(
      document.data['@metadata'] && document.data['@metadata'].userAgent
    );
  }

  /**
   * Parse the user_agent string into user readable fields
   * @param document The document to modify
   */
  apply(document: OsDocument): void {
    if (
      typeof document.data.user_agent?.original !== 'string' ||
      document.data.user_agent.original.length <= 1
    ) {
      return;
    }
    const userAgentString: string = document.data.user_agent.original;
    const parser = new UAParser(userAgentString);
    const ua = parser.getResult();
    const ecsUa = {
      name: ua.browser?.name,
      version: ua.browser?.version,
      os: {
        name: ua.os?.name,
        version: ua.os?.version,
      },
      device: {
        name: ua.device?.model,
        // type: ua.device?.type,
        // vendor: ua.device?.vendor,
      },
    };

    // Special cases
    // TODO: Remove hardcoding
    if (/YandexBot\//i.exec(userAgentString)) {
      ecsUa.name = 'YandexBot';
    } else if (/Googlebot\//i.exec(userAgentString)) {
      ecsUa.name = 'Googlebot';
    }

    document.data.user_agent = {
      ...document.data.user_agent,
      ...cleanDeep(ecsUa),
    };
  }
}
