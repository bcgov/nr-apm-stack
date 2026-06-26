import * as fs from 'fs';
import * as path from 'path';
import AwsService from './aws.service';
import { WorkflowSettings } from './opensearch-domain.service';

export default class OpenSearchPolicyService extends AwsService {
  public async syncStateManagementPolicy(
    settings: WorkflowSettings,
  ): Promise<any> {
    const templateDir = path.resolve(
      __dirname,
      '../../configuration-opensearch/state_management_policy',
    );
    for (const filePath of fs.readdirSync(templateDir)) {
      if (!filePath.endsWith('.json')) {
        continue;
      }
      const basename = path.basename(filePath, '.json');

      const existing = await this.executeSignedHttpRequest({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          host: settings.hostname,
        },
        hostname: settings.hostname,
        path: `/_plugins/_ism/policies/${basename}`,
      }).then((res) => this.waitAndReturnResponseBody(res, [404]));

      if (existing.statusCode === 404) {
        // Create
        await this.executeSignedHttpRequest({
          method: 'PUT',
          body: fs.readFileSync(path.resolve(templateDir, filePath), {
            encoding: 'utf8',
          }),
          headers: {
            'Content-Type': 'application/json',
            host: settings.hostname,
          },
          hostname: settings.hostname,
          path: `/_plugins/_ism/policies/${basename}`,
        })
          .then((res) => this.waitAndReturnResponseBody(res))

          .then((res) =>
            console.log(
              `[${res.statusCode}] State Management Policy Added - ${basename}`,
            ),
          );
      } else {
        // Update
        const bodyJson = JSON.parse(existing.body);
        await this.executeSignedHttpRequest({
          method: 'PUT',
          body: fs.readFileSync(path.resolve(templateDir, filePath), {
            encoding: 'utf8',
          }),
          headers: {
            'Content-Type': 'application/json',
            host: settings.hostname,
          },
          hostname: settings.hostname,
          path: `/_plugins/_ism/policies/${basename}`,
          query: {
            if_seq_no: `${bodyJson._seq_no}`,

            if_primary_term: `${bodyJson._primary_term}`,
          },
        })
          .then((res) => this.waitAndReturnResponseBody(res))

          .then((res) =>
            console.log(
              `[${res.statusCode}] State Management Policy Update - ${basename}`,
            ),
          );
      }
    }
  }
}
