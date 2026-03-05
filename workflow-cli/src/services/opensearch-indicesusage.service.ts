/* eslint-disable @typescript-eslint/no-explicit-any */
import AwsService from './aws.service';
import { appendFileSync } from 'fs';

export interface settings {
  hostname: string;
  domainName: string;
  region: string;
  accessId: string;
  accessKey: string;
  accountNumber: string;
  roleArn?: string;
  indicesname: string;
  fieldname: string;
}

export default class OpenSearchIndicesUsageService extends AwsService {
  public async getIndicesUsage(settings: settings): Promise<any> {
    const csvFileName = `./indicesusage-${this.getTimeStamp()}.csv`;
    const header = `index,health,${settings.fieldname},match.count,docs.count,store.size,percentage\n`;
    // write header to csv file
    this.saveToCSV(csvFileName, header);

    const arryIndices = await this.executeSignedHttpRequest({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: `/_cat/indices/${encodeURIComponent(settings.indicesname).replace('*', '%2A')}`,
      query: {
        format: 'json',
        bytes: 'kb',
        expand_wildcards: 'all',
      },
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => JSON.parse(res.body));
    for (const eachIndex of arryIndices) {
      const existing = await this.getFieldsDocsOfIndices(
        eachIndex.index,
        settings,
      );
      const buckets = JSON.parse(existing).aggregations.response_codes.buckets;

      for (const bucket of buckets) {
        const docPercent = Number(
          (bucket.doc_count / eachIndex['docs.count']) * 100,
        ).toFixed(2);
        // eslint-disable-next-line max-len, @typescript-eslint/restrict-template-expressions
        const csv = `${eachIndex.index},${eachIndex.health},${bucket.key},${bucket.doc_count},${eachIndex['docs.count']},${eachIndex['store.size']},${docPercent}\n`;
        this.saveToCSV(csvFileName, csv);
        // eslint-disable-next-line max-len, @typescript-eslint/restrict-template-expressions
        // console.log(`[${arryIndices[i].index}] ${arryIndices[i].health}, ${buckets[j].key}, ${buckets[j].doc_count}, ${arryIndices[i]["docs.count"]},${arryIndices[i]["store.size"]} occupied ${docPercent} `);
      }
    }
  }

  private async getFieldsDocsOfIndices(
    searchIndex: string,
    settings: settings,
  ): Promise<any> {
    return this.executeSignedHttpRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      body: JSON.stringify({
        size: 0,
        aggs: {
          response_codes: {
            terms: {
              field: `${settings.fieldname}`,
              size: 100,
            },
          },
        },
      }),
      query: {
        format: 'json',
      },
      hostname: settings.hostname,
      path: `/${searchIndex}/_search`,
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => {
        return res.body;
      });
  }

  private saveToCSV(filename: string, csvstring: string) {
    try {
      appendFileSync(filename, csvstring);
    } catch (err) {
      console.error(err);
    }
  }

  private getTimeStamp(): string {
    const date = new Date();
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear().toString();
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${year}.${month}.${day}-${hours}.${minutes}.${seconds}`;
  }
}
