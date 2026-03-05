/* eslint-disable @typescript-eslint/no-explicit-any */

import AwsService from './aws.service';

export interface settings {
  hostname: string;
  domainName: string;
  region: string;
  accessId: string;
  accessKey: string;
  accountNumber: string;
  roleArn?: string;
}

export default class OpenSearchSnapshotService extends AwsService {
  public async setupSnapshot(settings: settings): Promise<any> {
    return this.executeSignedHttpRequest({
      method: 'PUT',
      body: JSON.stringify({
        type: 's3',
        settings: {
          bucket: `${settings.domainName}-snapshot-${settings.accountNumber}`,
          region: settings.region,
          role_arn: `arn:aws:iam::${settings.accountNumber}:role/${settings.domainName}-opensearch-snapshot`,
          'server-side-encryption': true,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: `/_snapshot/s3-backup`,
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(`[${res.statusCode}] Setup started`);
      });
  }

  public async createSnapshot(settings: settings): Promise<any> {
    const timeStamp = this.getTimeStamp();
    return this.executeSignedHttpRequest({
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: `/_snapshot/s3-backup/${timeStamp}`,
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(
          `PUT _snapshot/s3-backup/${timeStamp}\n[${res.statusCode}] Snapshot started`,
        );
      });
  }

  private getTimeStamp(): string {
    const date = new Date();
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear().toString();
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${year}.${month}.${day}t${hours}h${minutes}m${seconds}s`;
  }
}
