import { EnhancedIamKeySyncService } from './enhanced-iam-key-sync.service';
import { LoggerService } from './util/logger.service';
import { S3StorageService } from './s3-storage.service';
import { VaultTokenManager } from './vault-token-manager.service';
import { SyncStateService } from './sync-state.service';
import { VaultService } from './vault.service';
import { IamKeySyncService } from './iam-key-sync.service';

// Mock all dependencies
jest.mock('./s3-storage.service');
jest.mock('./vault-token-manager.service');
jest.mock('./sync-state.service');
jest.mock('./vault.service');
jest.mock('./iam-key-sync.service');

describe('EnhancedIamKeySyncService', () => {
    let service: EnhancedIamKeySyncService;
    let mockLogger: jest.Mocked<LoggerService>;
    let mockS3Storage: jest.Mocked<S3StorageService>;
    let mockTokenManager: jest.Mocked<VaultTokenManager>;
    let mockStateService: jest.Mocked<SyncStateService>;
    let mockVaultService: jest.Mocked<VaultService>;
    let mockBaseSyncService: jest.Mocked<IamKeySyncService>;

    beforeEach(() => {
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        // Create mocks
        mockS3Storage = new S3StorageService(mockLogger, {
            bucketName: 'test',
        }) as jest.Mocked<S3StorageService>;

        mockTokenManager = new VaultTokenManager(mockLogger, mockS3Storage, {
            tokenS3Key: 'token.json',
        }) as jest.Mocked<VaultTokenManager>;

        mockStateService = new SyncStateService(mockLogger, mockS3Storage, {
            stateS3Key: 'state.json',
        }) as jest.Mocked<SyncStateService>;

        mockVaultService = new VaultService(
            mockLogger,
        ) as jest.Mocked<VaultService>;

        mockBaseSyncService = new IamKeySyncService(
            mockLogger,
            mockVaultService,
        ) as jest.Mocked<IamKeySyncService>;

        // Create service
        service = new EnhancedIamKeySyncService(mockLogger, {
            s3BucketName: 'test-bucket',
            vaultTokenS3Key: 'vault-token.json',
            syncStateS3Key: 'sync-state.json',
            vaultMount: 'secret',
            vaultPathPrefix: 'aws/iam-keys',
            syncIntervalHours: 24,
            tokenRefreshThresholdHours: 24,
        });

        // Inject mocks
        (service as any).s3Storage = mockS3Storage;
        (service as any).tokenManager = mockTokenManager;
        (service as any).stateService = mockStateService;
        (service as any).vaultService = mockVaultService;
        (service as any).baseSyncService = mockBaseSyncService;

        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize all services and set token', async () => {
            mockTokenManager.initialize = jest
                .fn()
                .mockResolvedValue(undefined);
            mockTokenManager.getToken = jest
                .fn()
                .mockReturnValue('hvs.test-token');
            mockStateService.initialize = jest
                .fn()
                .mockResolvedValue(undefined);
            mockVaultService.setToken = jest.fn();

            await service.initialize();

            expect(mockTokenManager.initialize).toHaveBeenCalled();
            expect(mockTokenManager.getToken).toHaveBeenCalled();
            expect(mockVaultService.setToken).toHaveBeenCalledWith(
                'hvs.test-token',
            );
            expect(mockStateService.initialize).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Enhanced IAM Key Sync Service initialized',
            );
        });
    });

    describe('runSync', () => {
        beforeEach(() => {
            mockTokenManager.initialize = jest
                .fn()
                .mockResolvedValue(undefined);
            mockTokenManager.getToken = jest
                .fn()
                .mockReturnValue('hvs.test-token');
            mockStateService.initialize = jest
                .fn()
                .mockResolvedValue(undefined);
            mockVaultService.setToken = jest.fn();
        });

        it('should skip sync if not time to run', async () => {
            mockStateService.shouldRunSync = jest.fn().mockReturnValue(false);
            mockStateService.getStatistics = jest.fn().mockReturnValue({
                lastRunAt: new Date().toISOString(),
                nextRunAt: new Date(
                    Date.now() + 12 * 60 * 60 * 1000,
                ).toISOString(),
                totalUsers: 0,
                hoursSinceLastRun: 12,
            });

            await service.initialize();
            const result = await service.runSync(['john.doe']);

            expect(result.shouldHaveRun).toBe(false);
            expect(result.usersProcessed).toBe(0);
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Sync not needed'),
            );
        });

        it('should sync users when time to run', async () => {
            mockStateService.shouldRunSync = jest.fn().mockReturnValue(true);
            mockTokenManager.ensureValidToken = jest
                .fn()
                .mockResolvedValue(undefined);
            mockStateService.hasSecretChanged = jest.fn().mockReturnValue(true);
            mockStateService.updateUserState = jest
                .fn()
                .mockResolvedValue(undefined);
            mockStateService.completeSyncRun = jest
                .fn()
                .mockResolvedValue(undefined);

            // Mock base sync service getKeysFromSSM
            (mockBaseSyncService as any).getKeysFromSSM = jest
                .fn()
                .mockResolvedValue({
                    current: {
                        AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                        SecretAccessKey:
                            'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    },
                });

            mockBaseSyncService.syncKeyToVault = jest.fn().mockResolvedValue({
                userName: 'john.doe',
                success: true,
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                syncedAt: new Date(),
            });

            await service.initialize();
            const result = await service.runSync(['john.doe']);

            expect(result.shouldHaveRun).toBe(true);
            expect(result.usersProcessed).toBe(1);
            expect(result.usersUpdated).toBe(1);
            expect(result.usersFailed).toBe(0);
            expect(mockTokenManager.ensureValidToken).toHaveBeenCalled();
            expect(mockStateService.completeSyncRun).toHaveBeenCalled();
        });

        it('should skip vault sync if secret unchanged', async () => {
            mockStateService.shouldRunSync = jest.fn().mockReturnValue(true);
            mockTokenManager.ensureValidToken = jest
                .fn()
                .mockResolvedValue(undefined);
            mockStateService.hasSecretChanged = jest
                .fn()
                .mockReturnValue(false);
            mockStateService.updateUserState = jest
                .fn()
                .mockResolvedValue(undefined);
            mockStateService.completeSyncRun = jest
                .fn()
                .mockResolvedValue(undefined);

            // Mock base sync service getKeysFromSSM
            (mockBaseSyncService as any).getKeysFromSSM = jest
                .fn()
                .mockResolvedValue({
                    current: {
                        AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                        SecretAccessKey:
                            'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    },
                });

            await service.initialize();
            const result = await service.runSync(['john.doe']);

            expect(result.shouldHaveRun).toBe(true);
            expect(result.usersUpdated).toBe(1);
            expect(mockBaseSyncService.syncKeyToVault).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Secret unchanged for john.doe'),
            );
        });

        it('should sync multiple users', async () => {
            mockStateService.shouldRunSync = jest.fn().mockReturnValue(true);
            mockTokenManager.ensureValidToken = jest
                .fn()
                .mockResolvedValue(undefined);
            mockStateService.hasSecretChanged = jest.fn().mockReturnValue(true);
            mockStateService.updateUserState = jest
                .fn()
                .mockResolvedValue(undefined);
            mockStateService.completeSyncRun = jest
                .fn()
                .mockResolvedValue(undefined);

            // Mock base sync service getKeysFromSSM
            (mockBaseSyncService as any).getKeysFromSSM = jest
                .fn()
                .mockResolvedValue({
                    current: {
                        AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                        SecretAccessKey:
                            'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    },
                });

            mockBaseSyncService.syncKeyToVault = jest.fn().mockResolvedValue({
                userName: 'test-user',
                success: true,
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                syncedAt: new Date(),
            });

            await service.initialize();
            const result = await service.runSync(['john.doe', 'jane.smith']);

            expect(result.usersProcessed).toBe(2);
            expect(result.usersUpdated).toBe(2);
            expect(result.usersFailed).toBe(0);
        });

        it('should handle user sync failures gracefully', async () => {
            mockStateService.shouldRunSync = jest.fn().mockReturnValue(true);
            mockTokenManager.ensureValidToken = jest
                .fn()
                .mockResolvedValue(undefined);
            mockStateService.completeSyncRun = jest
                .fn()
                .mockResolvedValue(undefined);

            // Mock first user fails, second succeeds
            (mockBaseSyncService as any).getKeysFromSSM = jest
                .fn()
                .mockRejectedValueOnce(new Error('SSM error'))
                .mockResolvedValueOnce({
                    current: {
                        AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                        SecretAccessKey:
                            'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    },
                });

            mockStateService.hasSecretChanged = jest.fn().mockReturnValue(true);
            mockBaseSyncService.syncKeyToVault = jest.fn().mockResolvedValue({
                userName: 'jane.smith',
                success: true,
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                syncedAt: new Date(),
            });

            await service.initialize();
            const result = await service.runSync(['john.doe', 'jane.smith']);

            expect(result.usersProcessed).toBe(2);
            expect(result.usersUpdated).toBe(1);
            expect(result.usersFailed).toBe(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to sync user john.doe'),
            );
        });
    });

    describe('getStatistics', () => {
        it('should return statistics from state service', () => {
            const mockStats = {
                lastRunAt: new Date().toISOString(),
                nextRunAt: new Date().toISOString(),
                totalUsers: 5,
                hoursSinceLastRun: 12,
            };

            mockStateService.getStatistics = jest
                .fn()
                .mockReturnValue(mockStats);

            const stats = service.getStatistics();

            expect(stats).toEqual(mockStats);
        });
    });

    describe('getTokenInfo', () => {
        it('should return token info from token manager', () => {
            const mockTokenInfo = {
                expiresAt: new Date().toISOString(),
                hoursRemaining: 48,
            };

            mockTokenManager.getTokenInfo = jest
                .fn()
                .mockReturnValue(mockTokenInfo);

            const info = service.getTokenInfo();

            expect(info).toEqual(mockTokenInfo);
        });
    });

    describe('refreshToken', () => {
        it('should refresh token and update vault service', async () => {
            mockTokenManager.refreshToken = jest
                .fn()
                .mockResolvedValue(undefined);
            mockTokenManager.getToken = jest
                .fn()
                .mockReturnValue('hvs.new-token');
            mockVaultService.setToken = jest.fn();

            await service.refreshToken();

            expect(mockTokenManager.refreshToken).toHaveBeenCalled();
            expect(mockVaultService.setToken).toHaveBeenCalledWith(
                'hvs.new-token',
            );
        });
    });
});
