import { ScheduledEvent, Context } from 'aws-lambda';
import { createEnhancedIamKeySyncService } from './index';
import { LoggerConsoleService } from './util/logger-console.service';

/**
 * Lambda handler for scheduled IAM key sync
 * Triggered by EventBridge on a schedule (default: once per day)
 *
 * Environment Variables:
 * - VAULT_ADDR: Vault server address
 * - VAULT_MOUNT: Vault KV mount path (default: 'secret')
 * - VAULT_PATH_PREFIX: Vault path prefix (default: 'aws/iam-keys')
 * - S3_BUCKET_NAME: S3 bucket for state storage
 * - VAULT_TOKEN_S3_KEY: S3 key for Vault token (default: 'vault-token.json')
 * - SYNC_STATE_S3_KEY: S3 key for sync state (default: 'sync-state.json')
 * - IAM_USER_LIST: Comma-separated list of usernames to sync
 * - SYNC_INTERVAL_HOURS: Minimum hours between syncs (default: 24)
 * - TOKEN_REFRESH_THRESHOLD_HOURS: Hours before token expiry to refresh (default: 24)
 * - LOG_LEVEL: Log level (default: 'info')
 */
export async function handler(
    event: ScheduledEvent,
    context: Context,
): Promise<void> {
    const logger = new LoggerConsoleService();
    logger.info(
        `IAM key sync Lambda invoked - eventId: ${event.id}, eventTime: ${event.time}, requestId: ${context.requestId}`,
    );

    // Validate required environment variables
    const requiredEnvVars = [
        'VAULT_ADDR',
        'S3_BUCKET_NAME',
        'IAM_USER_LIST',
    ];
    const missing = requiredEnvVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
        logger.error(
            `Missing required environment variables: ${missing.join(', ')}`,
        );
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`,
        );
    }

    // Parse user list from environment variable
    const userListStr = process.env.IAM_USER_LIST || '';
    const userNames = userListStr
        .split(',')
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

    if (userNames.length === 0) {
        logger.warn('No users in IAM_USER_LIST, skipping sync');
        return;
    }

    logger.info(`Syncing ${userNames.length} users: ${userNames.join(', ')}`);

    try {
        // Create and initialize enhanced sync service
        const service = createEnhancedIamKeySyncService(
            {
                s3BucketName: process.env.S3_BUCKET_NAME!,
                vaultTokenS3Key:
                    process.env.VAULT_TOKEN_S3_KEY || 'vault-token.json',
                syncStateS3Key:
                    process.env.SYNC_STATE_S3_KEY || 'sync-state.json',
                vaultMount: process.env.VAULT_MOUNT || 'secret',
                vaultPathPrefix:
                    process.env.VAULT_PATH_PREFIX || 'aws/iam-keys',
                syncIntervalHours: parseInt(
                    process.env.SYNC_INTERVAL_HOURS || '24',
                    10,
                ),
                tokenRefreshThresholdHours: parseInt(
                    process.env.TOKEN_REFRESH_THRESHOLD_HOURS || '24',
                    10,
                ),
            },
            logger,
        );

        await service.initialize();

        // Run sync
        const result = await service.runSync(userNames);

        // Log results
        if (result.shouldHaveRun) {
            logger.info(
                `Sync completed - Processed: ${result.usersProcessed}, Updated: ${result.usersUpdated}, Failed: ${result.usersFailed}`,
            );

            if (result.usersFailed > 0) {
                const failures = result.results
                    .filter((r) => !r.success)
                    .map((r) => r.userName);
                logger.warn(
                    `${result.usersFailed} user(s) failed to sync: ${failures.join(', ')}`,
                );
            }
        } else {
            logger.info('Sync not needed based on schedule');
            const stats = service.getStatistics();
            logger.info(`Next sync scheduled for: ${stats?.nextRunAt}`);
        }

        // Log token info
        const tokenInfo = service.getTokenInfo();
        if (tokenInfo && tokenInfo.expiresAt) {
            const hoursUntilExpiry = Math.floor(
                (new Date(tokenInfo.expiresAt).getTime() - Date.now()) /
                    (1000 * 60 * 60),
            );
            logger.info(`Vault token expires in ${hoursUntilExpiry} hours`);
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        logger.error(`IAM key sync failed: ${errorMessage}`);
        throw error;
    }
}

