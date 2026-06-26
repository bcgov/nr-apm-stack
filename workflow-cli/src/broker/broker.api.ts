import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { inject, injectable } from 'inversify';
import { GraphServerInstallsResponseDto } from './dto/graph-server-installs-rest.dto';
import { TYPES } from '../inversify.types';

/**
 *
 */
@injectable()
export class BrokerApi {
  private axiosOptions!: AxiosRequestConfig;
  private serverInstallsReq: Promise<
    AxiosResponse<GraphServerInstallsResponseDto[], any>
  > | null = null;

  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.BrokerApiUrl) private brokerApi: string,
    @inject(TYPES.BrokerToken) private brokerToken: string,
  ) {
    this.setToken();
  }

  public setToken() {
    this.axiosOptions = {
      baseURL: this.brokerApi,
      headers: {
        Authorization: `Bearer ${this.brokerToken}`,
      },
    };
  }

  public getServiceDetails(serviceId: string) {
    return axios.get(
      `v1/collection/service/${serviceId}/details`,
      this.axiosOptions,
    );
  }

  public async getGraphServerInstalls(): Promise<
    GraphServerInstallsResponseDto[]
  > {
    if (!this.serverInstallsReq) {
      this.serverInstallsReq = axios.get<GraphServerInstallsResponseDto[]>(
        'v1/graph/data/server-installs',
        this.axiosOptions,
      );
    }
    return (await this.serverInstallsReq).data;
  }
}
