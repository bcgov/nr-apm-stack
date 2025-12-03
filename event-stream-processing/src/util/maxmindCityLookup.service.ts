/* istanbul ignore file */

import { injectable } from 'inversify';
import { CityResponse, Reader } from 'maxmind';
import * as path from 'path';
import * as fs from 'fs';
import { MaxmindLookupService } from './maxmindLookup.service';
@injectable()
export class MaxmindCityLookupService implements MaxmindLookupService<CityResponse> {
  private cityLookup: Reader<CityResponse> | null = null;
  public constructor() {
    const dbPath =
      process.env.MAXMIND_DB_DIR ||
      path.join(__dirname, '../../layer/maxmind-geoip-db/nodejs/asset');
    const filePath = path.join(dbPath, 'GeoLite2-City.mmdb');
    console.log(fs.readdirSync('/opt/'));
    if (fs.existsSync(filePath)) {
      this.cityLookup = new Reader<CityResponse>(fs.readFileSync(filePath));
    }
  }
  public lookup(ipAddress: string): CityResponse | null {
    return this.cityLookup ? this.cityLookup.get(ipAddress) : null;
  }
}
