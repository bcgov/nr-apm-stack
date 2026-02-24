import axios, { AxiosRequestConfig } from 'axios';
import { inject, injectable } from 'inversify';
import { TYPES } from '../inversify.types';

@injectable()
/**
 * Shared Vault APIs
 */
export default class VaultApi {
  private axiosOptions!: AxiosRequestConfig;

  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.VaultApiUrl) private vaultApiUrl: string,
    @inject(TYPES.VaultToken) private vaultToken: string,
  ) {
    this.setToken();
  }

  public setToken() {
    this.axiosOptions = {
      baseURL: this.vaultApiUrl,
      headers: {
        'X-Vault-Token': this.vaultToken,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Read vault path
   */
  public async read(path: string): Promise<any> {
    return (await axios.get(path, this.axiosOptions)).data;
  }

  public async patch(path: string, data: any): Promise<any> {
    return (await axios.patch(path, data, this.axiosOptions)).data;
  }

  /**
   * Write vault path
   */
  public async write(path: string, data: any): Promise<any> {
    return (await axios.post(path, data, this.axiosOptions)).data;
  }
}
