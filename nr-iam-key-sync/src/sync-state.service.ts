import { createHash } from 'crypto';
import { S3StorageService } from './s3-storage.service';
import { LoggerService } from './util/logger.service';

export interface UserSyncState {
    userName: string;
    lastSecretHash: string;
    lastSyncedAt: string;
}

export interface SyncState {
    lastRunAt: string;
    users: Record<string, UserSyncState>;
}

export interface SyncStateConfig {
    stateS3Key: string;
    syncIntervalHours?: number;
}

/**
 * Service for tracking sync state
 * Stores last run time and last synced access keys per user
 */
export class SyncStateService {
    private state: SyncState | null = null;
    private stateS3Key: string;
    private syncIntervalHours: number;

    constructor(
        private logger: LoggerService,
        private s3Storage: S3StorageService,
        config: SyncStateConfig,
    ) {
        this.stateS3Key = config.stateS3Key;
        this.syncIntervalHours = config.syncIntervalHours || 24; // Default: once per day
    }

    /**
     * Initialize the state service by loading state from S3
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing sync state service');

        const stateData = await this.s3Storage.getJson<SyncState>(
            this.stateS3Key,
        );

        if (!stateData) {
            this.logger.info(
                'No previous sync state found, creating new state',
            );
            this.state = {
                lastRunAt: new Date(0).toISOString(), // Epoch, ensures first run
                users: {},
            };
        } else {
            this.state = stateData;
            this.logger.info(
                `Sync state loaded. Last run: ${this.state.lastRunAt}`,
            );
        }
    }

    /**
     * Check if sync should run based on last run time
     * @returns True if enough time has passed since last run
     */
    shouldRunSync(): boolean {
        if (!this.state) {
            throw new Error(
                'Sync state not initialized. Call initialize() first.',
            );
        }

        const now = new Date();
        const lastRun = new Date(this.state.lastRunAt);
        const hoursSinceLastRun =
            (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

        const shouldRun = hoursSinceLastRun >= this.syncIntervalHours;

        if (shouldRun) {
            this.logger.info(
                `Sync should run. Hours since last run: ${hoursSinceLastRun.toFixed(2)}`,
            );
        } else {
            this.logger.info(
                `Sync not needed. Hours since last run: ${hoursSinceLastRun.toFixed(2)}, ` +
                    `next sync in ${(this.syncIntervalHours - hoursSinceLastRun).toFixed(2)} hours`,
            );
        }

        return shouldRun;
    }

    /**
     * Hash secret data for comparison
     * @param secretData Object containing access key and secret
     * @returns SHA-256 hash of the secret data
     */
    private hashSecret(secretData: {
        AccessKeyID: string;
        SecretAccessKey: string;
    }): string {
        const dataString = JSON.stringify({
            accessKeyId: secretData.AccessKeyID,
            secretAccessKey: secretData.SecretAccessKey,
        });
        return createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Get the last synced secret hash for a user
     * @param userName The username
     * @returns The last secret hash, or null if never synced
     */
    private getLastSecretHash(userName: string): string | null {
        if (!this.state) {
            throw new Error(
                'Sync state not initialized. Call initialize() first.',
            );
        }

        return this.state.users[userName]?.lastSecretHash || null;
    }

    /**
     * Check if a user's secret has changed
     * Compares hash of current secret against stored hash
     * @param userName The username
     * @param currentSecret The current secret data from SSM
     * @returns True if the secret has changed or user has never been synced
     */
    hasSecretChanged(
        userName: string,
        currentSecret: { AccessKeyID: string; SecretAccessKey: string },
    ): boolean {
        const lastSecretHash = this.getLastSecretHash(userName);

        if (!lastSecretHash) {
            this.logger.info(`User ${userName} has never been synced`);
            return true;
        }

        const currentHash = this.hashSecret(currentSecret);
        const hasChanged = lastSecretHash !== currentHash;

        if (hasChanged) {
            this.logger.info(
                `Secret changed for ${userName} (hash comparison)`,
            );
        } else {
            this.logger.debug(`Secret unchanged for ${userName}`);
        }

        return hasChanged;
    }

    /**
     * Update the sync state for a user
     * Stores hash of secret instead of actual credentials
     * @param userName The username
     * @param secretData The secret data that was synced
     */
    async updateUserState(
        userName: string,
        secretData: { AccessKeyID: string; SecretAccessKey: string },
    ): Promise<void> {
        if (!this.state) {
            throw new Error(
                'Sync state not initialized. Call initialize() first.',
            );
        }

        const now = new Date().toISOString();
        const secretHash = this.hashSecret(secretData);

        this.state.users[userName] = {
            userName,
            lastSecretHash: secretHash,
            lastSyncedAt: now,
        };

        this.logger.debug(`Updated state for user ${userName}`);
    }

    /**
     * Mark the sync run as complete and save state to S3
     */
    async completeSyncRun(): Promise<void> {
        if (!this.state) {
            throw new Error(
                'Sync state not initialized. Call initialize() first.',
            );
        }

        this.state.lastRunAt = new Date().toISOString();

        await this.s3Storage.putJson(this.stateS3Key, this.state);

        this.logger.info(
            `Sync run completed. State saved to S3 at ${this.state.lastRunAt}`,
        );
    }

    /**
     * Get the current state (for debugging/monitoring)
     * @returns The current sync state
     */
    getState(): SyncState | null {
        return this.state;
    }

    /**
     * Get statistics about the sync state
     * @returns Object with state statistics
     */
    getStatistics(): {
        lastRunAt: string;
        hoursSinceLastRun: number;
        totalUsers: number;
        nextRunAt: string;
    } | null {
        if (!this.state) {
            return null;
        }

        const now = new Date();
        const lastRun = new Date(this.state.lastRunAt);
        const hoursSinceLastRun =
            (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
        const nextRun = new Date(
            lastRun.getTime() + this.syncIntervalHours * 60 * 60 * 1000,
        );

        return {
            lastRunAt: this.state.lastRunAt,
            hoursSinceLastRun,
            totalUsers: Object.keys(this.state.users).length,
            nextRunAt: nextRun.toISOString(),
        };
    }
}
