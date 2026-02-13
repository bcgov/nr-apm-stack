import {
    SSMClient,
    GetParameterCommand,
    GetParameterCommandOutput,
} from '@aws-sdk/client-ssm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { LoggerService } from './util/logger.service';
import { VaultService } from './vault.service';

export interface KeyPair {
    AccessKeyID: string;
    SecretAccessKey: string;
}

export interface StoredKeys {
    pending_deletion?: KeyPair;
    current: KeyPair;
}

export interface KeySyncResult {
    userName: string;
    success: boolean;
    accessKeyId: string;
    syncedAt: Date;
}

export class IamKeySyncService {
    private ssmClient: SSMClient;
    private readonly SSM_PARAMETER_PATH_PREFIX = '/iam_users';

    constructor(
        private logger: LoggerService,
        private vaultService: VaultService,
    ) {
        const region = process.env.AWS_DEFAULT_REGION || 'ca-central-1';
        const credentials = defaultProvider();

        this.ssmClient = new SSMClient({ region, credentials });
    }

    /**
     * Read rotated IAM access key from SSM Parameter Store and sync to Vault
     * Checks if Vault has the pending_deletion key - if so, writes the current key from SSM
     * Note: This service syncs already-rotated keys; rotation is handled externally
     * @param userName The IDIR username
     * @param vaultMount The Vault KV mount path (e.g., 'secret')
     * @param vaultPath The Vault secret path (e.g., 'aws/iam-keys/username')
     * @returns The sync result
     */
    async syncKeyToVault(
        userName: string,
        vaultMount: string,
        vaultPath: string,
    ): Promise<KeySyncResult> {
        this.logger.info(`Syncing IAM key for user: ${userName} to Vault`);

        try {
            // Read keys from SSM Parameter Store
            const ssmParameterName = `${this.SSM_PARAMETER_PATH_PREFIX}/${userName}_keys`;
            const storedKeys = await this.getKeysFromSSM(ssmParameterName);

            if (!storedKeys?.current) {
                throw new Error(
                    `No current access key found in SSM for user ${userName}`,
                );
            }

            // Check if Vault has a key stored
            let shouldSync = false;
            try {
                const vaultData = await this.vaultService.getKv<{
                    accessKeyId: string;
                }>(vaultMount, vaultPath);

                // If Vault has the pending_deletion key, sync the current key
                if (
                    storedKeys.pending_deletion &&
                    vaultData.accessKeyId ===
                        storedKeys.pending_deletion.AccessKeyID
                ) {
                    this.logger.info(
                        `Vault has pending_deletion key for ${userName}, syncing current key`,
                    );
                    shouldSync = true;
                } else if (
                    vaultData.accessKeyId !== storedKeys.current.AccessKeyID
                ) {
                    // Vault has a different key, sync the current one
                    this.logger.info(
                        `Vault has outdated key for ${userName}, syncing current key`,
                    );
                    shouldSync = true;
                } else {
                    this.logger.info(
                        `Vault already has current key for ${userName}, skipping sync`,
                    );
                }
            } catch (error) {
                // Vault doesn't have the key yet, sync it
                this.logger.info(
                    `No key found in Vault for ${userName}, syncing current key`,
                );
                shouldSync = true;
            }

            if (shouldSync) {
                // Write current key to Vault
                await this.vaultService.postKv(vaultMount, vaultPath, {
                    accessKeyId: storedKeys.current.AccessKeyID,
                    secretAccessKey: storedKeys.current.SecretAccessKey,
                    userName,
                    syncedAt: new Date().toISOString(),
                });

                this.logger.info(
                    `Successfully synced key ${storedKeys.current.AccessKeyID} for user ${userName} to Vault at ${vaultMount}/${vaultPath}`,
                );
            }

            return {
                userName,
                success: true,
                accessKeyId: storedKeys.current.AccessKeyID,
                syncedAt: new Date(),
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to sync key for user ${userName}: ${errorMessage}`,
            );
            throw error;
        }
    }

    /**
     * Get stored keys from SSM Parameter Store
     * @param parameterName The SSM parameter name
     * @returns The stored keys or null if not found
     */
    private async getKeysFromSSM(
        parameterName: string,
    ): Promise<StoredKeys | null> {
        try {
            const command = new GetParameterCommand({
                Name: parameterName,
                WithDecryption: true,
            });

            const response: GetParameterCommandOutput =
                await this.ssmClient.send(command);

            if (!response.Parameter?.Value) {
                return null;
            }

            return JSON.parse(response.Parameter.Value) as StoredKeys;
        } catch (error) {
            if (error instanceof Error && error.name === 'ParameterNotFound') {
                this.logger.warn(`Parameter ${parameterName} not found in SSM`);
                return null;
            }
            throw error;
        }
    }

    /**
     * Sync keys for multiple users to Vault
     * @param syncConfigs Array of sync configurations
     * @returns Array of sync results
     */
    async syncMultipleKeysToVault(
        syncConfigs: Array<{
            userName: string;
            vaultMount: string;
            vaultPath: string;
        }>,
    ): Promise<KeySyncResult[]> {
        const results: KeySyncResult[] = [];

        for (const config of syncConfigs) {
            try {
                const result = await this.syncKeyToVault(
                    config.userName,
                    config.vaultMount,
                    config.vaultPath,
                );
                results.push(result);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `Failed to sync key for ${config.userName}: ${errorMessage}`,
                );
                // Continue with other syncs even if one fails
            }
        }

        return results;
    }
}
