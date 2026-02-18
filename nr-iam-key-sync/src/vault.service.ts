import { LoggerService } from './util/logger.service';

export interface VaultResponse<T = any> {
    data: {
        data: T;
        metadata?: {
            created_time: string;
            deletion_time: string;
            destroyed: boolean;
            version: number;
        };
    };
}

export class VaultService {
    private vaultAddr: string;
    private vaultToken: string;

    constructor(
        private logger: LoggerService,
        token?: string,
    ) {
        this.vaultAddr = process.env.VAULT_ADDR || 'http://localhost:8200';
        this.vaultToken = token || process.env.VAULT_TOKEN || '';

        if (!this.vaultToken) {
            this.logger.warn(
                'VAULT_TOKEN not set. Vault operations will fail until token is provided.',
            );
        }
    }

    /**
     * Set the Vault token dynamically
     * Used by VaultTokenManager to update token after refresh
     * @param token The Vault token
     */
    setToken(token: string): void {
        this.vaultToken = token;
        this.logger.debug('Vault token updated');
    }

    /**
     * Check if the service has a valid Vault token
     * @returns True if token is available
     */
    hasValidToken(): boolean {
        return !!this.vaultToken;
    }

    /**
     * Get a secret from Vault KV v2 engine
     * @param mount The KV mount path
     * @param path The secret path
     * @returns The secret data
     */
    async getKv<T = any>(mount: string, path: string): Promise<T> {
        this.ensureToken();

        const url = `${this.vaultAddr}/v1/${mount}/data/${path}`;
        const response = await this.makeRequest<VaultResponse<T>>('GET', url);

        if (!response.data?.data) {
            throw new Error(`No secrets found at the specified path: ${path}`);
        }

        return response.data.data;
    }

    /**
     * Write a secret to Vault KV v2 engine
     * @param mount The KV mount path
     * @param path The secret path
     * @param data The secret data to write
     */
    async postKv(mount: string, path: string, data: any): Promise<void> {
        this.ensureToken();

        const url = `${this.vaultAddr}/v1/${mount}/data/${path}`;
        await this.makeRequest('POST', url, { data });

        this.logger.info(`Secret written to Vault at ${mount}/${path}`);
    }

    /**
     * Update a secret in Vault KV v2 engine (patch)
     * @param mount The KV mount path
     * @param path The secret path
     * @param data The secret data to update
     */
    async patchKv(mount: string, path: string, data: any): Promise<void> {
        this.ensureToken();

        const url = `${this.vaultAddr}/v1/${mount}/data/${path}`;
        await this.makeRequest(
            'PATCH',
            url,
            { data },
            {
                'Content-Type': 'application/merge-patch+json',
            },
        );

        this.logger.info(`Secret updated in Vault at ${mount}/${path}`);
    }

    /**
     * Delete a secret from Vault KV v2 engine
     * @param mount The KV mount path
     * @param path The secret path
     */
    async deleteKv(mount: string, path: string): Promise<void> {
        this.ensureToken();

        const url = `${this.vaultAddr}/v1/${mount}/data/${path}`;
        await this.makeRequest('DELETE', url);

        this.logger.info(`Secret deleted from Vault at ${mount}/${path}`);
    }

    /**
     * Make an HTTP request to Vault
     * @param method HTTP method
     * @param url Full URL to request
     * @param body Optional request body
     * @param additionalHeaders Optional additional headers
     * @returns Response data
     */
    private async makeRequest<T = any>(
        method: string,
        url: string,
        body?: any,
        additionalHeaders?: Record<string, string>,
    ): Promise<T> {
        const headers: Record<string, string> = {
            'X-Vault-Token': this.vaultToken,
            'Content-Type': 'application/json',
            ...additionalHeaders,
        };

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Vault request failed with status ${response.status}: ${errorText}`,
                );
            }

            // DELETE requests may not return a body
            if (method === 'DELETE') {
                return {} as T;
            }

            return (await response.json()) as T;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            this.logger.error(`Vault request failed: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Ensure a Vault token is configured
     * @throws Error if no token is available
     */
    private ensureToken(): void {
        if (!this.vaultToken) {
            throw new Error(
                'Vault token not configured. Set VAULT_TOKEN environment variable.',
            );
        }
    }
}
