import { LoggerService } from './util/logger.service';
import { VaultService } from './vault.service';
import { VaultTokenManager } from './vault-token-manager.service';
import { SyncStateService } from './sync-state.service';
import { IamKeySyncService, KeySyncResult } from './iam-key-sync.service';
import { S3StorageService } from './s3-storage.service';

export interface EnhancedSyncConfig {
    s3BucketName: string;
    vaultTokenS3Key: string;
    syncStateS3Key: string;
    vaultMount: string;
    vaultPathPrefix: string;
    syncIntervalHours?: number;
    tokenRefreshThresholdHours?: number;
}

export interface SyncRunResult {
    shouldHaveRun: boolean;
    usersProcessed: number;
    usersUpdated: number;
    usersFailed: number;
    results: KeySyncResult[];
}

/**
 * Enhanced IAM Key Sync Service with S3 state tracking and Vault token management
 *
 * Features:
 * - Stores Vault token in encrypted S3 bucket
 * - Automatically refreshes Vault token before expiry
 * - Tracks last sync time and only runs once per day
 * - Compares access keys before syncing to Vault
 * - Persists sync state in encrypted S3 bucket
 */
export class EnhancedIamKeySyncService {
    private s3Storage: S3StorageService;
    private tokenManager: VaultTokenManager;
    private stateService: SyncStateService;
    private vaultService: VaultService;
    private baseSyncService: IamKeySyncService;
    private config: EnhancedSyncConfig;

    constructor(
        private logger: LoggerService,
        config: EnhancedSyncConfig,
    ) {
        this.config = config;

        // Initialize S3 storage
        this.s3Storage = new S3StorageService(logger, {
            bucketName: config.s3BucketName,
        });

        // Initialize Vault token manager
        this.tokenManager = new VaultTokenManager(logger, this.s3Storage, {
            tokenS3Key: config.vaultTokenS3Key,
            refreshThresholdHours: config.tokenRefreshThresholdHours,
        });

        // Initialize sync state service
        this.stateService = new SyncStateService(logger, this.s3Storage, {
            stateS3Key: config.syncStateS3Key,
            syncIntervalHours: config.syncIntervalHours,
        });

        // Initialize Vault service (token will be set after initialization)
        this.vaultService = new VaultService(logger);

        // Initialize base sync service
        this.baseSyncService = new IamKeySyncService(logger, this.vaultService);
    }

    /**
     * Initialize all services
     * Must be called before performing any sync operations
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing Enhanced IAM Key Sync Service');

        // Initialize token manager and get token
        await this.tokenManager.initialize();
        const token = this.tokenManager.getToken();
        this.vaultService.setToken(token);

        // Initialize sync state
        await this.stateService.initialize();

        this.logger.info('Enhanced IAM Key Sync Service initialized');
    }

    /**
     * Run sync for multiple users
     * Checks timing, compares access keys, and only syncs when needed
     *
     * @param userNames Array of usernames to sync
     * @returns Sync run result
     */
    async runSync(userNames: string[]): Promise<SyncRunResult> {
        this.logger.info(`Starting sync run for ${userNames.length} users`);

        // Check if sync should run based on timing
        const shouldRun = this.stateService.shouldRunSync();

        if (!shouldRun) {
            const stats = this.stateService.getStatistics();
            this.logger.info(
                `Sync not needed. Next sync scheduled for ${stats?.nextRunAt}`,
            );
            return {
                shouldHaveRun: false,
                usersProcessed: 0,
                usersUpdated: 0,
                usersFailed: 0,
                results: [],
            };
        }

        // Ensure Vault token is valid before syncing
        await this.tokenManager.ensureValidToken();
        this.vaultService.setToken(this.tokenManager.getToken());

        const results: KeySyncResult[] = [];
        let usersUpdated = 0;
        let usersFailed = 0;

        // Process each user
        for (const userName of userNames) {
            try {
                const result = await this.syncUser(userName);
                results.push(result);

                if (result.success) {
                    usersUpdated++;
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `Failed to sync user ${userName}: ${errorMessage}`,
                );
                usersFailed++;
            }
        }

        // Mark sync as complete and save state
        await this.stateService.completeSyncRun();

        const summary = {
            shouldHaveRun: true,
            usersProcessed: userNames.length,
            usersUpdated,
            usersFailed,
            results,
        };

        this.logger.info(
            `Sync run completed. Processed: ${userNames.length}, ` +
                `Updated: ${usersUpdated}, Failed: ${usersFailed}`,
        );

        return summary;
    }

    /**
     * Sync a single user
     * Checks if access key has changed before syncing
     *
     * @param userName The username to sync
     * @returns Sync result
     */
    private async syncUser(userName: string): Promise<KeySyncResult> {
        this.logger.info(`Processing user: ${userName}`);

        const vaultPath = `${this.config.vaultPathPrefix}/${userName}`;

        // Get current access key from SSM
        const ssmParameterName = `/iam_users/${userName}_keys`;
        const storedKeys =
            await this.baseSyncService['getKeysFromSSM'](ssmParameterName);

        if (!storedKeys?.current) {
            throw new Error(
                `No current access key found in SSM for user ${userName}`,
            );
        }

        // Check if secret has changed (using hash comparison)
        const hasChanged = this.stateService.hasSecretChanged(
            userName,
            storedKeys.current,
        );

        if (!hasChanged) {
            this.logger.info(
                `Secret unchanged for ${userName}, skipping Vault sync`,
            );
            return {
                userName,
                success: true,
                accessKeyId: storedKeys.current.AccessKeyID,
                syncedAt: new Date(),
            };
        }

        // Secret has changed, sync to Vault
        this.logger.info(`Secret changed for ${userName}, syncing to Vault`);

        const result = await this.baseSyncService.syncKeyToVault(
            userName,
            this.config.vaultMount,
            vaultPath,
        );

        // Update state to track this sync (stores hash, not actual secret)
        await this.stateService.updateUserState(userName, storedKeys.current);

        return result;
    }

    /**
     * Get sync statistics
     * @returns Statistics about the sync state
     */
    getStatistics() {
        return this.stateService.getStatistics();
    }

    /**
     * Get Vault token information
     * @returns Token expiry details
     */
    getTokenInfo() {
        return this.tokenManager.getTokenInfo();
    }

    /**
     * Force a token refresh
     * Useful for testing or manual operations
     */
    async refreshToken(): Promise<void> {
        await this.tokenManager.refreshToken();
        this.vaultService.setToken(this.tokenManager.getToken());
    }
}
