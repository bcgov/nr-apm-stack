import { IamKeySyncService, KeySyncResult } from './iam-key-sync.service';
import {
    EnhancedIamKeySyncService,
    EnhancedSyncConfig,
    SyncRunResult,
} from './enhanced-iam-key-sync.service';
import { VaultService } from './vault.service';
import { LoggerService } from './util/logger.service';
import { LoggerConsoleService } from './util/logger-console.service';
import { S3StorageService, S3StorageConfig } from './s3-storage.service';
import {
    VaultTokenManager,
    VaultTokenData,
    VaultTokenManagerConfig,
} from './vault-token-manager.service';
import {
    SyncStateService,
    SyncState,
    UserSyncState,
    SyncStateConfig,
} from './sync-state.service';

export {
    // Basic sync service
    IamKeySyncService,
    KeySyncResult,
    // Enhanced sync service with S3 state tracking
    EnhancedIamKeySyncService,
    EnhancedSyncConfig,
    SyncRunResult,
    // Supporting services
    VaultService,
    LoggerService,
    LoggerConsoleService,
    S3StorageService,
    S3StorageConfig,
    VaultTokenManager,
    VaultTokenData,
    VaultTokenManagerConfig,
    SyncStateService,
    SyncState,
    UserSyncState,
    SyncStateConfig,
};

// Convenience function to create basic IAM Key Sync service
export function createIamKeySyncService(
    logger?: LoggerService,
    vaultService?: VaultService,
): IamKeySyncService {
    const loggerInstance = logger || new LoggerConsoleService();
    const vaultInstance = vaultService || new VaultService(loggerInstance);
    return new IamKeySyncService(loggerInstance, vaultInstance);
}

// Convenience function to create Enhanced IAM Key Sync service
export function createEnhancedIamKeySyncService(
    config: EnhancedSyncConfig,
    logger?: LoggerService,
): EnhancedIamKeySyncService {
    const loggerInstance = logger || new LoggerConsoleService();
    return new EnhancedIamKeySyncService(loggerInstance, config);
}
