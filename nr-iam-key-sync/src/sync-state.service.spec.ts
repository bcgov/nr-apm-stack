import { SyncStateService, SyncState } from './sync-state.service';
import { S3StorageService } from './s3-storage.service';
import { LoggerService } from './util/logger.service';

describe('SyncStateService', () => {
    let service: SyncStateService;
    let mockLogger: jest.Mocked<LoggerService>;
    let mockS3Storage: jest.Mocked<S3StorageService>;

    beforeEach(() => {
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        // Create mock S3 storage
        mockS3Storage = {
            getJson: jest.fn(),
            putJson: jest.fn(),
            getObject: jest.fn(),
            putObject: jest.fn(),
            objectExists: jest.fn(),
        } as any;

        service = new SyncStateService(mockLogger, mockS3Storage, {
            stateS3Key: 'sync-state.json',
            syncIntervalHours: 24,
        });

        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should load existing state from S3', async () => {
            const mockState: SyncState = {
                lastRunAt: new Date(
                    Date.now() - 12 * 60 * 60 * 1000,
                ).toISOString(),
                users: {
                    'john.doe': {
                        userName: 'john.doe',
                        lastSecretHash: 'abc123hash',
                        lastSyncedAt: new Date().toISOString(),
                    },
                },
            };

            mockS3Storage.getJson.mockResolvedValue(mockState);

            await service.initialize();

            expect(mockS3Storage.getJson).toHaveBeenCalledWith(
                'sync-state.json',
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Sync state loaded'),
            );
        });

        it('should create new state if none exists', async () => {
            mockS3Storage.getJson.mockResolvedValue(null);

            await service.initialize();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'No previous sync state found, creating new state',
            );
        });
    });

    describe('shouldRunSync', () => {
        it('should return true if sync interval has passed', async () => {
            const mockState: SyncState = {
                lastRunAt: new Date(
                    Date.now() - 25 * 60 * 60 * 1000,
                ).toISOString(), // 25 hours ago
                users: {},
            };

            mockS3Storage.getJson.mockResolvedValue(mockState);
            await service.initialize();

            const shouldRun = service.shouldRunSync();

            expect(shouldRun).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Sync should run'),
            );
        });

        it('should return false if sync interval has not passed', async () => {
            const mockState: SyncState = {
                lastRunAt: new Date(
                    Date.now() - 12 * 60 * 60 * 1000,
                ).toISOString(), // 12 hours ago
                users: {},
            };

            mockS3Storage.getJson.mockResolvedValue(mockState);
            await service.initialize();

            const shouldRun = service.shouldRunSync();

            expect(shouldRun).toBe(false);
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Sync not needed'),
            );
        });

        it('should return true for first run (epoch time)', async () => {
            mockS3Storage.getJson.mockResolvedValue(null);
            await service.initialize();

            const shouldRun = service.shouldRunSync();

            expect(shouldRun).toBe(true);
        });

        it('should throw error if not initialized', async () => {
            expect(() => service.shouldRunSync()).toThrow(
                'Sync state not initialized. Call initialize() first.',
            );
        });
    });

    describe('hasSecretChanged', () => {
        it('should return true if user has never been synced', async () => {
            const mockState: SyncState = {
                lastRunAt: new Date().toISOString(),
                users: {},
            };

            mockS3Storage.getJson.mockResolvedValue(mockState);
            await service.initialize();

            const hasChanged = service.hasSecretChanged('john.doe', {
                AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                SecretAccessKey: 'secret123',
            });

            expect(hasChanged).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'User john.doe has never been synced',
            );
        });

        it('should return true if secret has changed', async () => {
            const firstSecret = {
                AccessKeyID: 'AKIAI44QH8DHBEXAMPLE',
                SecretAccessKey: 'oldsecret',
            };

            mockS3Storage.getJson.mockResolvedValue(null);
            await service.initialize();
            await service.updateUserState('john.doe', firstSecret);

            const newSecret = {
                AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                SecretAccessKey: 'newsecret',
            };
            const hasChanged = service.hasSecretChanged('john.doe', newSecret);

            expect(hasChanged).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Secret changed for john.doe'),
            );
        });

        it('should return false if secret is unchanged', async () => {
            const secret = {
                AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                SecretAccessKey: 'secret123',
            };

            mockS3Storage.getJson.mockResolvedValue(null);
            await service.initialize();
            await service.updateUserState('john.doe', secret);

            const hasChanged = service.hasSecretChanged('john.doe', secret);

            expect(hasChanged).toBe(false);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Secret unchanged for john.doe'),
            );
        });
    });

    describe('updateUserState', () => {
        it('should update user sync state with hash', async () => {
            mockS3Storage.getJson.mockResolvedValue(null);
            await service.initialize();

            const secret = {
                AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                SecretAccessKey: 'secret123',
            };
            await service.updateUserState('john.doe', secret);

            const state = service.getState();
            expect(state?.users['john.doe']).toBeDefined();
            expect(state?.users['john.doe'].userName).toBe('john.doe');
            expect(state?.users['john.doe'].lastSecretHash).toBeDefined();
            expect(state?.users['john.doe'].lastSecretHash).not.toContain(
                'AKIAIOSFODNN7EXAMPLE',
            );
            expect(state?.users['john.doe'].lastSecretHash).not.toContain(
                'secret123',
            );
            expect(state?.users['john.doe'].lastSyncedAt).toBeDefined();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Updated state for user john.doe',
            );
        });
    });

    describe('completeSyncRun', () => {
        it('should update last run time and save to S3', async () => {
            mockS3Storage.getJson.mockResolvedValue(null);
            await service.initialize();

            await service.completeSyncRun();

            expect(mockS3Storage.putJson).toHaveBeenCalledWith(
                'sync-state.json',
                expect.objectContaining({
                    lastRunAt: expect.any(String),
                    users: expect.any(Object),
                }),
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Sync run completed'),
            );
        });
    });

    describe('getStatistics', () => {
        it('should return sync statistics', async () => {
            const lastRun = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
            const mockState: SyncState = {
                lastRunAt: lastRun.toISOString(),
                users: {
                    'john.doe': {
                        userName: 'john.doe',
                        lastSecretHash: 'hash1',
                        lastSyncedAt: new Date().toISOString(),
                    },
                    'jane.smith': {
                        userName: 'jane.smith',
                        lastSecretHash: 'hash2',
                        lastSyncedAt: new Date().toISOString(),
                    },
                },
            };

            mockS3Storage.getJson.mockResolvedValue(mockState);
            await service.initialize();

            const stats = service.getStatistics();

            expect(stats).not.toBeNull();
            expect(stats?.lastRunAt).toBe(lastRun.toISOString());
            expect(stats?.totalUsers).toBe(2);
            expect(stats?.hoursSinceLastRun).toBeGreaterThan(11);
            expect(stats?.hoursSinceLastRun).toBeLessThan(13);
            expect(stats?.nextRunAt).toBeDefined();
        });

        it('should return null if not initialized', () => {
            const stats = service.getStatistics();

            expect(stats).toBeNull();
        });
    });

    describe('getState', () => {
        it('should return current state', async () => {
            const mockState: SyncState = {
                lastRunAt: new Date().toISOString(),
                users: {},
            };

            mockS3Storage.getJson.mockResolvedValue(mockState);
            await service.initialize();

            const state = service.getState();

            expect(state).toEqual(mockState);
        });

        it('should return null if not initialized', () => {
            const state = service.getState();

            expect(state).toBeNull();
        });
    });
});
