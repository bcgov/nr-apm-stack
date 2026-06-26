import { injectable } from 'inversify';
import lodash from 'lodash';
import { OsDocument, OsDocumentData } from '../types/os-document';
import { Parser } from '../types/parser';

@injectable()
/**
 * Parse key value pairs in source objects into a string.
 * @deprecated
 */
export class JoinKvParser implements Parser {
  /**
   * Returns true if metadata has a rename field.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return !!(document.data['@metadata'] && document.data['@metadata'].joinKv);
  }

  /**
   * Parse key value pairs in source objects into a string.
   * @param document The document to modify
   */
  apply(document: OsDocument): void {
    const joinkvArr = (document.data['@metadata'].joinKv as string).split(',');

    for (const joinKvPath of joinkvArr) {
      const query = lodash.get(document.data, joinKvPath);
      if (query) {
        lodash.set(
          document.data,
          joinKvPath,
          this.showQueryParamsAsString(query),
        );
      }
    }
  }

  /**
   * Serialize query paramaters from object properties to a query string
   */
  private showQueryParamsAsString(query: OsDocumentData): string {
    const queryString = Object.keys(query)

      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return queryString;
  }
}
