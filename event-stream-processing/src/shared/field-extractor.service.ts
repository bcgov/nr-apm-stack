import { injectable } from 'inversify';
import * as path from 'path';
import { OsDocument } from '../types/os-document';
import lodash from 'lodash';

@injectable()
export class FieldExtractorService {
  fieldStringToArray(fieldString: string, document: OsDocument): any[] {
    return fieldString.split(',').map((docPath) => {
      if (docPath.startsWith('basename(')) {
        const filePath = lodash.get(
          document.data,
          docPath.substring(9, docPath.length - 1),
          '',
        );
        return path.basename(filePath);
      } else if (docPath === 'kinesis.eventID') {
        // Grab from record as the kinesis fields may not be set
        return document.record.eventID;
      }
      return lodash.get(document.data, docPath, '');
    });
  }
}
