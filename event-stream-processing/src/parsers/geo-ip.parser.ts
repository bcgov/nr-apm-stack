import { inject, injectable } from 'inversify';
import { Parser } from '../types/parser';
import { TYPES } from '../inversify.types';
import type { GeoIpService } from '../util/geoip.service';
import { OsDocument } from '../types/os-document';

@injectable()
/**
 * Do geo ip lookup on fields in document
 * Tag: Support
 */
export class GeoIpParser implements Parser {
  /**
   * Constructor
   * @param geoIp The GeoIp service
   */
  constructor(@inject(TYPES.GeoIpService) private geoIp: GeoIpService) {}

  /**
   * Returns true if metadata has a geoIp field.
   * @param document The document to match against
   * @returns
   */
  matches(document: OsDocument): boolean {
    return (
      !!(document.data['@metadata'] && document.data['@metadata'].geoIp) &&
      !!(document.data?.source?.ip || document.data?.source?.address)
    );
  }

  /**
   * Do geo ip lookup on fields in document
   * @param document The document to modify
   */
  apply(document: OsDocument): void {
    if (document.data?.source?.ip) {
      Object.assign(
        document.data.source,
        this.geoIp.lookup(document.data.source.ip),
      );
    } else if (document.data?.source?.address) {
      Object.assign(
        document.data.source,
        this.geoIp.lookup(document.data.source.address),
      );
    }
  }
}
