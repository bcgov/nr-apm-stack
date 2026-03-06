import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import ejs from 'ejs';

import AwsService from './aws.service';
import { WorkflowSettings } from './opensearch-domain.service';
import { BrokerApi } from '../broker/broker.api';
import { GraphServerInstallInstanceDto } from '../broker/dto/graph-server-installs-rest.dto';
import { inject, injectable } from 'inversify';
import { TYPES } from '../inversify.types';

const ID_MAX_LENGTH = 20;

export interface MonitorConfiguration {
  name: string;
  server: string;
  agent: string;
  query_level_trigger_id: string;
  teams_channel_action_id: string;
  automation_queue_action_id: string;
}
export interface AlertAgentConfiguration {
  type: 'agent';
}
export interface AlertServerConfiguration {
  type: 'server';
}

export type EnvironmentNames = 'tools' | 'development' | 'test' | 'production';
export interface AlertServiceConfiguration {
  type: 'service';
  serviceId: string;
  environments: EnvironmentNames[];
}

export type AlertConfiguration =
  | AlertAgentConfiguration
  | AlertServerConfiguration
  | AlertServiceConfiguration;

const ALERT_CONFIG_DIR = path.resolve(
  __dirname,
  '../../configuration-opensearch/alerting',
);
const MONITORS_PREFIX = 'nrids_';

@injectable()
export default class OpenSearchMonitorService extends AwsService {
  constructor(@inject(TYPES.BrokerApi) private brokerApi: BrokerApi) {
    super();
  }

  private getFluentBitInstance(
    instances: GraphServerInstallInstanceDto[],
  ): GraphServerInstallInstanceDto | undefined {
    return instances.find((instance) => instance.service.name === 'fluent-bit');
  }

  private getAgentCount(instance: GraphServerInstallInstanceDto) {
    if (instance.edgeProp['agent_count']) {
      return Number.parseInt(instance.edgeProp['agent_count']);
    }
    return 1;
  }

  public async sync(settings: WorkflowSettings): Promise<any> {
    const servers = await this.brokerApi.getGraphServerInstalls();
    const environments: EnvironmentNames[] = [
      'tools',
      'development',
      'test',
      'production',
    ];
    let monitors: any[] = [];
    const idgen = (...args: any) => {
      return crypto
        .createHash('sha256')
        .update(args.join())
        .digest('hex')
        .substring(0, ID_MAX_LENGTH);
    };

    if (settings.dryRun) {
      console.log('Dry run: No changes will be made');
    }

    for (const alertFile of fs.readdirSync(ALERT_CONFIG_DIR)) {
      if (!alertFile.endsWith('config.json')) {
        continue;
      }
      const alertConfigStr = fs.readFileSync(
        path.resolve(ALERT_CONFIG_DIR, alertFile),
        { encoding: 'utf8' },
      );
      const alertConfig: AlertConfiguration = JSON.parse(alertConfigStr);
      const alertMonitorStr = fs.readFileSync(
        path.join(ALERT_CONFIG_DIR, `${alertFile.slice(0, -12)}.monitor.json`),
        { encoding: 'utf8' },
      );

      if (alertConfig.type === 'service') {
        const serviceData = await this.brokerApi.getServiceDetails(
          alertConfig.serviceId,
        );
        for (const environment of environments) {
          if (alertConfig.environments.indexOf(environment) === -1) {
            continue;
          }
          monitors.push(
            JSON.parse(
              ejs.render(alertMonitorStr, {
                service: serviceData.data,
                environment,
                idgen,
              }),
            ),
          );
        }
      }

      for (const server of servers) {
        const fbInstance = this.getFluentBitInstance(server.instances);
        if (!fbInstance) {
          // skip
          continue;
        }
        const agentCount = this.getAgentCount(fbInstance);
        const installHas = (id: string) => {
          return (
            fbInstance.edgeProp &&
            fbInstance.edgeProp['app_ids'] &&
            fbInstance.edgeProp['app_ids'].split(',').indexOf(id) !== -1
          );
        };
        const serverTag = (tag: string) => {
          return server.tags && server.tags.indexOf(tag) !== -1;
        };

        const context: any = {
          server,
          instance: fbInstance,
          idgen,
          installHas,
          serverTag,
        };

        if (alertConfig.type === 'agent') {
          for (let agentIndex = 0; agentIndex < agentCount; agentIndex++) {
            monitors.push(
              JSON.parse(
                ejs.render(alertMonitorStr, {
                  agent: {
                    index: agentIndex,
                  },
                  ...context,
                }),
              ),
            );
          }
        } else if (alertConfig.type === 'server') {
          monitors.push(JSON.parse(ejs.render(alertMonitorStr, context)));
        }
      }
    }

    // Remove objects that have a key '$$OMIT' that equals 'true'
    monitors = monitors
      .map((monitor) => {
        // Wrap monitor in an object so that predicate works on object root (and then unwrap)
        return this.recursiveOmit(
          { monitor },
          (key: any, value: any) =>
            typeof value === 'object' &&
            value !== null &&
            value['$$OMIT'] === 'true',
          ['$$OMIT'],
        ).monitor;
      })
      // Strip out monitors where root key '$$OMIT' was 'true'
      .filter((monitor) => monitor !== undefined);

    const monitorNameSet = new Set(monitors.map((monitor) => monitor.name));

    const existingMonitorReq = await this.executeSignedHttpRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: settings.hostname,
      },
      hostname: settings.hostname,
      path: '/_plugins/_alerting/monitors/_search',
      body: JSON.stringify({
        size: 10000,
        query: {
          match_bool_prefix: {
            'monitor.name': MONITORS_PREFIX,
          },
        },
      }),
    }).then((res) => this.waitAndReturnResponseBody(res, [404]));
    const existingMonitorHits = JSON.parse(existingMonitorReq.body).hits.hits;
    const removeHits = existingMonitorHits.filter(
      (hit: any) => !monitorNameSet.has(hit._source.name),
    );

    // console.log(removeHits);
    // console.log(JSON.stringify(monitors));
    // return;
    for (const removeHit of removeHits) {
      console.log(`Remove monitor: ${removeHit._source.name}`);
      if (!settings.dryRun) {
        // DELETE _plugins/_alerting/monitors/<monitor_id>
        await this.executeSignedHttpRequest({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            host: settings.hostname,
          },
          hostname: settings.hostname,
          path: `/_plugins/_alerting/monitors/${removeHit._id}`,
        }).then((res) => this.waitAndReturnResponseBody(res, [404]));
      }
    }

    // Build a lookup of existing monitors by exact name
    const existingMonitorByName = new Map<string, any>();
    for (const hit of existingMonitorHits) {
      existingMonitorByName.set(hit._source.name, hit);
    }

    for (const monitor of monitors) {
      let existingHit = existingMonitorByName.get(monitor.name);

      // Fallback: per-monitor search if not found in bulk lookup
      if (!existingHit) {
        const fallbackReq = await this.executeSignedHttpRequest({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            host: settings.hostname,
          },
          hostname: settings.hostname,
          path: '/_plugins/_alerting/monitors/_search',
          body: JSON.stringify({
            size: 10,
            query: {
              match: {
                'monitor.name': {
                  query: monitor.name,
                  operator: 'and',
                },
              },
            },
          }),
        }).then((res) => this.waitAndReturnResponseBody(res, [404]));
        const fallbackBody = JSON.parse(fallbackReq.body);
        // Filter client-side for exact name match
        existingHit = fallbackBody.hits.hits.find(
          (hit: any) => hit._source.name === monitor.name,
        );
      }

      if (!existingHit) {
        // Add
        // POST _plugins/_alerting/monitors
        console.log(`Add monitor: ${monitor.name}`);
        if (!settings.dryRun) {
          await this.executeSignedHttpRequest({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              host: settings.hostname,
            },
            hostname: settings.hostname,
            path: '/_plugins/_alerting/monitors',
            body: JSON.stringify(monitor),
          }).then((res) => this.waitAndReturnResponseBody(res, [404]));
        }
      } else {
        // Update
        // PUT _plugins/_alerting/monitors/<monitor_id>
        console.log(`Update monitor: ${monitor.name}`);
        if (!settings.dryRun) {
          if (!existingHit._source.enabled) {
            // Do not re-enable
            monitor.enabled = false;
          }
          await this.executeSignedHttpRequest({
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              host: settings.hostname,
            },
            hostname: settings.hostname,
            path: `/_plugins/_alerting/monitors/${existingHit._id}`,
            body: JSON.stringify(monitor),
          }).then((res) => this.waitAndReturnResponseBody(res, [404]));
        }
      }
    }
  }

  private recursiveOmit(object: any, predicate: any, omitKeys: string[]): any {
    if (Array.isArray(object)) {
      return object
        .filter((val: any, index) => !predicate(index, val, object))
        .map((val: any) => this.recursiveOmit(val, predicate, omitKeys));
    } else if (typeof object !== 'object') {
      return object;
    }

    const result: any = {};
    for (const key of Reflect.ownKeys(object)) {
      const descriptor = Object.getOwnPropertyDescriptor(object, key);

      if (!descriptor?.enumerable || omitKeys.indexOf(key.toString()) !== -1) {
        continue;
      }

      const value = object[key];
      if (!predicate(key, value, object)) {
        Object.defineProperty(result, key, descriptor);
        if (typeof object === 'object' && object !== null) {
          result[key] = this.recursiveOmit(result[key], predicate, omitKeys);
        }
      }
    }
    return result;
  }
}
