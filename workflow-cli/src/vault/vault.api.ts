import axios, { AxiosRequestConfig } from 'axios';
import { inject, injectable } from 'inversify';
import { TYPES } from '../inversify.types';

@injectable()
/**
 * Shared Vault APIs
 */
export default class VaultApi {
  private axiosOptions!: AxiosRequestConfig;
  private axiosPatchOptions!: AxiosRequestConfig;

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
    this.axiosPatchOptions = {
      baseURL: this.vaultApiUrl,
      headers: {
        'X-Vault-Token': this.vaultToken,
        'Content-Type': 'application/merge-patch+json',
      },
    };
  }

  /**
   * Read vault path
   */
  public async read(path: string): Promise<any> {
    return (await axios.get(path, this.axiosOptions)).data;
  }

  public async readKvMetadata(mount: string, path: string): Promise<any> {
    try {
      return (
        await axios.get(`v1/${mount}/metadata/${path}`, this.axiosOptions)
      ).data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null; // Metadata not found
      }
      throw error; // Rethrow other errors
    }
  }

  public async patchKvMetadata(
    mount: string,
    path: string,
    customMetadata: any,
  ): Promise<any> {
    return (
      await axios.patch(
        `v1/${mount}/metadata/${path}`,
        { custom_metadata: customMetadata },
        this.axiosPatchOptions,
      )
    ).data;
  }

  public async patch(path: string, data: any): Promise<any> {
    return (await axios.patch(path, data, this.axiosPatchOptions)).data;
  }

  /**
   * Write vault path
   */
  public async write(path: string, data: any): Promise<any> {
    return (await axios.post(path, data, this.axiosOptions)).data;
  }
}
