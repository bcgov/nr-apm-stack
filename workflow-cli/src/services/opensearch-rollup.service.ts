import * as fs from 'fs';
import * as path from 'path';
import AwsService from './aws.service';
import { WorkflowSettings } from './opensearch-domain.service';

export default class OpenSearchRollupService extends AwsService {
  public async createOrUpdateRollupJob(
    settings: WorkflowSettings,
  ): Promise<any> {
    const templateDir = path.resolve(
      __dirname,
      '../../configuration-opensearch/rollup_index_jobs',
    );

    for (const filePath of fs.readdirSync(templateDir)) {
      if (!filePath.endsWith('.json')) {
        continue;
      }
      const rollupJobName = path.basename(filePath, '.json');
      let rollupJobPath = `/_plugins/_rollup/jobs/${rollupJobName}`;
      const exists = await this.checkRollupJobExists(settings, rollupJobName);
      const rollupConfig = JSON.parse(
        fs.readFileSync(path.join(templateDir, filePath), 'utf8'),
      );

      if (exists) {
        rollupJobPath += '?if_seq_no=1&if_primary_term=1';
        console.log(`Updating existing rollup job: ${rollupJobName}`);
        return this.executeRollupRequest(
          'PUT',
          settings,
          rollupJobPath,
          rollupConfig,
        ).then((res) => {
          console.log(
            `PUT ${rollupJobPath}\n[${res.statusCode}] Rollup job updated`,
          );
        });
      } else {
        console.log(`Creating new rollup job: ${rollupJobName}`);
        return this.executeRollupRequest(
          'PUT',
          settings,
          rollupJobPath,
          rollupConfig,
        ).then((res) => {
          console.log(
            `PUT ${rollupJobPath}\n[${res.statusCode}] Rollup job created`,
          );
        });
      }
    }
  }

  private async executeRollupRequest(
    method: string,
    settings: WorkflowSettings,
    path: string,
    body?: any,
  ): Promise<any> {
    const [pathWithoutQuery, queryString] = path.split('?');
    const queryParams = queryString
      ? Object.fromEntries(new URLSearchParams(queryString).entries())
      : undefined;
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: pathWithoutQuery,
      query: queryParams,
      body: body ? JSON.stringify(body) : undefined,
    };

    return this.executeSignedHttpRequest(requestOptions)
      .then((res) => this.waitAndReturnResponseBody(res))
      .catch((err) => {
        console.error(
          `Error during ${method} request to ${path}: ${err.message}`,
        );
        throw err;
      });
  }

  // check if the rollup job exists
  private async checkRollupJobExists(
    settings: WorkflowSettings,
    jobName: string,
  ): Promise<boolean> {
    const rollupJobPath = `/_plugins/_rollup/jobs/${jobName}`;
    return this.executeRollupRequest('GET', settings, rollupJobPath)
      .then((res) => {
        if (res.statusCode === 200) {
          console.log(`[${res.statusCode}] Rollup job exists`);
          return true;
        } else if (res.statusCode === 404) {
          console.log(`[${res.statusCode}] Rollup job does not exist`);
          return false;
        } else {
          throw new Error(`Unexpected status code: ${res.statusCode}`);
        }
      })
      .catch((err) => {
        if (err.response?.statusCode === 404) {
          console.log(`[404] Rollup job does not exist`);
          return false;
        }
        console.error(`Error checking rollup job: ${err.message}`);
        throw err;
      });
  }
}
