import { S3StorageService } from './s3-storage.service';
import { LoggerService } from './util/logger.service';

export interface VaultTokenData {
    token: string;
    createdAt: string;
    expiresAt: string;
    renewable: boolean;
    ttl: number;
}

export interface VaultTokenManagerConfig {
    tokenS3Key: string;
    refreshThresholdHours?: number;
}

/**
 * Service for managing Vault token lifecycle
 * Fetches token from S3, refreshes when needed, and stores updates
 */
export class VaultTokenManager {
    private currentToken: VaultTokenData | null = null;
    private tokenS3Key: string;
    private refreshThresholdHours: number;
    private vaultAddr: string;

    constructor(
        private logger: LoggerService,
        private s3Storage: S3StorageService,
        config: VaultTokenManagerConfig,
    ) {
        this.tokenS3Key = config.tokenS3Key;
        this.refreshThresholdHours = config.refreshThresholdHours || 24;
        this.vaultAddr = process.env.VAULT_ADDR || 'http://localhost:8200';
    }

    /**
     * Initialize the token manager by loading token from S3
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing Vault token manager');

        const tokenData = await this.s3Storage.getJson<VaultTokenData>(
            this.tokenS3Key,
        );

        if (!tokenData) {
            throw new Error(
                `Vault token not found in S3 at key: ${this.tokenS3Key}. ` +
                    'Please store a valid Vault token in S3 before running the sync service.',
            );
        }

        this.currentToken = tokenData;
        this.logger.info('Vault token loaded from S3');

        // Check if token needs refresh
        if (this.shouldRefreshToken()) {
            await this.refreshToken();
        }
    }

    /**
     * Get the current Vault token
     * @returns The Vault token string
     */
    getToken(): string {
        if (!this.currentToken) {
            throw new Error(
                'Vault token not initialized. Call initialize() first.',
            );
        }
        return this.currentToken.token;
    }

    /**
     * Check if the token should be refreshed
     * @returns True if token should be refreshed
     */
    private shouldRefreshToken(): boolean {
        if (!this.currentToken) {
            return false;
        }

        const now = new Date();
        const expiresAt = new Date(this.currentToken.expiresAt);
        const hoursUntilExpiry =
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        return (
            hoursUntilExpiry < this.refreshThresholdHours &&
            this.currentToken.renewable
        );
    }

    /**
     * Refresh the Vault token
     * Uses Vault's token self-renewal API
     */
    async refreshToken(): Promise<void> {
        if (!this.currentToken) {
            throw new Error('No token to refresh');
        }

        if (!this.currentToken.renewable) {
            this.logger.warn('Current Vault token is not renewable');
            return;
        }

        try {
            this.logger.info('Refreshing Vault token');

            const response = await fetch(
                `${this.vaultAddr}/v1/auth/token/renew-self`,
                {
                    method: 'POST',
                    headers: {
                        'X-Vault-Token': this.currentToken.token,
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to refresh token: ${response.status} ${errorText}`,
                );
            }

            const data = (await response.json()) as {
                auth: {
                    client_token?: string;
                    lease_duration: number;
                    renewable: boolean;
                };
            };
            const auth = data.auth;

            // Update token data
            const now = new Date();
            const updatedToken: VaultTokenData = {
                token: auth.client_token || this.currentToken.token,
                createdAt: this.currentToken.createdAt,
                expiresAt: new Date(
                    now.getTime() + auth.lease_duration * 1000,
                ).toISOString(),
                renewable: auth.renewable,
                ttl: auth.lease_duration,
            };

            // Store updated token in S3
            await this.s3Storage.putJson(this.tokenS3Key, updatedToken);
            this.currentToken = updatedToken;

            this.logger.info('Vault token refreshed and stored in S3');
        } catch (error) {
            this.logger.error(`Failed to refresh Vault token: ${error}`);
            throw error;
        }
    }

    /**
     * Ensure token is valid and refresh if needed
     * Call this before performing Vault operations
     */
    async ensureValidToken(): Promise<void> {
        if (this.shouldRefreshToken()) {
            await this.refreshToken();
        }
    }

    /**
     * Get token expiry information
     * @returns Object with expiry details
     */
    getTokenInfo(): { expiresAt: string; hoursRemaining: number } | null {
        if (!this.currentToken) {
            return null;
        }

        const now = new Date();
        const expiresAt = new Date(this.currentToken.expiresAt);
        const hoursRemaining =
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        return {
            expiresAt: this.currentToken.expiresAt,
            hoursRemaining: Math.max(0, hoursRemaining),
        };
    }
}
