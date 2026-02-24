import AwsService, { settings } from './aws.service';
import * as fs from 'fs';
import * as path from 'path';
import ora from 'ora';
import * as tp from 'timers/promises';

interface ReindexSettings extends settings {
  hostname: string;
  domainName: string;
  config: string;
}

export default class ReindexService extends AwsService {
  public async reindex(settings: ReindexSettings): Promise<any> {
    const spinner = ora('Loading config').start();
    const templateDir = path.resolve(__dirname, '../../configuration-reindex');
    const reindexConfigStr = fs.readFileSync(
      path.resolve(templateDir, `${settings.config}.json`),
      { encoding: 'utf8' },
    );
    const reindexConfig = JSON.parse(reindexConfigStr);
    spinner.succeed().start('Loading indexes');
    const script = fs.readFileSync(
      path.resolve(templateDir, `${settings.config}.painless`),
      { encoding: 'utf8' },
    );
    const sourceIndices = await this.getIndices(
      reindexConfig.source.indexPrefix,
      settings,
    );
    const destIndices = await this.getIndices(
      reindexConfig.dest.indexPrefix,
      settings,
    );

    let remaining = this.remainingIndices(sourceIndices, destIndices);
    spinner.succeed(`Loading indexes [${remaining.length.toString()}]`);

    while (remaining.length > 0) {
      remaining = this.remainingIndices(
        await this.getIndices(reindexConfig.source.indexPrefix, settings),
        await this.getIndices(reindexConfig.dest.indexPrefix, settings),
      );
      const reindexDate = remaining.pop();
      if (reindexDate) {
        const statusPrefix = 'Status: ';
        spinner.start(
          `Reindex: ${reindexConfig.source.indexPrefix as string}${reindexDate}`,
        );
        const taskId = await this.startReindex(
          `${reindexConfig.source.indexPrefix as string}${reindexDate}`,
          `${reindexConfig.dest.indexPrefix as string}${reindexDate}`,
          script,
          JSON.parse(reindexConfigStr).prototype,
          settings,
        );
        spinner.succeed(
          `Reindex: ${reindexConfig.source.indexPrefix as string}${reindexDate} [${taskId}]`,
        );
        spinner.start(statusPrefix);
        let taskInfo;
        do {
          taskInfo = await this.checkTask(taskId, settings);
          const percent = Math.round(
            (taskInfo.task.status.created / taskInfo.task.status.total) * 100,
          );
          spinner.text = statusPrefix + `${percent} %`;
          await tp.setTimeout(percent > 95 ? 10000 : 60000);
        } while (taskInfo && !taskInfo.completed);

        if (taskInfo.response.failures.length > 0) {
          spinner.fail();
          console.log(taskInfo.response.failures);
          break;
        } else {
          spinner.succeed();
          spinner
            .start()
            .info(
              `DELETE ${reindexConfig.source.indexPrefix as string}${reindexDate}`,
            );
          await tp.setTimeout(Math.round(10000));
          // spinner.start(`DELETE ${reindexConfig.source.indexPrefix as string}${reindexDate}`);
          // const delSuccess =
          //   await this.deleteIndex(`DELETE ${reindexConfig.source.indexPrefix as string}${reindexDate}`, settings);
          // spinner.succeed();
        }
      }
    }
    return Promise.resolve();
  }

  private remainingIndices(sourceIndices: any, destIndices: any): string[] {
    const remaining = [];
    const destIndiceMap = new Map();

    for (const index of destIndices) {
      destIndiceMap.set(index.suffix, true);
    }

    for (const index of sourceIndices) {
      if (!destIndiceMap.has(index.suffix)) {
        remaining.push(index.suffix);
      }
    }
    return remaining;
  }

  private async startReindex(
    sourceIndex: string,
    destinationIndex: string,
    script: string,
    prototype: any,
    settings: ReindexSettings,
  ): Promise<string> {
    prototype.source.index = [sourceIndex];
    prototype.dest.index = destinationIndex;
    prototype.script.inline = script;

    return this.executeSignedHttpRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      body: JSON.stringify(prototype),
      path: `_reindex`,
      query: {
        wait_for_completion: 'false',
      },
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        // console.log(`[${res.statusCode}] Reindex started`);
        return JSON.parse(res.body).task;
      });
  }

  private async checkTask(taskId: string, settings: ReindexSettings) {
    return await this.executeSignedHttpRequest({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: `_tasks/${taskId}`,
      query: {
        format: 'json',
      },
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        // console.log(`[${res.statusCode}] Got indices`);
        return JSON.parse(res.body);
      });
  }

  private async getIndices(indexPrefix: string, settings: ReindexSettings) {
    return await this.executeSignedHttpRequest({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: `_cat/indices/${indexPrefix}%2A`,
      query: {
        expand_wildcards: 'all',
        format: 'json',
      },
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        // console.log(`[${res.statusCode}] Got indices`);
        return JSON.parse(res.body).map((index: any) => {
          return {
            index: index.index,
            suffix: (index.index as string).substring(indexPrefix.length),
          };
        });
      });
  }

  private async deleteIndex(index: string, settings: ReindexSettings) {
    return await this.executeSignedHttpRequest({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: `${index}`,
    })
      .then((res) => this.waitAndReturnResponseBody(res))
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        // console.log(`[${res.statusCode}] Got indices`);
        return res.statusCode === 200;
      });
  }
}
