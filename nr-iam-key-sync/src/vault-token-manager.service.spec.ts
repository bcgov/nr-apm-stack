import {
    VaultTokenManager,
    VaultTokenData,
} from './vault-token-manager.service';
import { S3StorageService } from './s3-storage.service';
import { LoggerService } from './util/logger.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('VaultTokenManager', () => {
    let manager: VaultTokenManager;
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

        // Set Vault address
        process.env.VAULT_ADDR = 'http://localhost:8200';

        manager = new VaultTokenManager(mockLogger, mockS3Storage, {
            tokenS3Key: 'vault-token.json',
            refreshThresholdHours: 24,
        });

        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should load token from S3', async () => {
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(
                    Date.now() + 48 * 60 * 60 * 1000,
                ).toISOString(),
                renewable: true,
                ttl: 172800,
            };

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);

            await manager.initialize();

            expect(mockS3Storage.getJson).toHaveBeenCalledWith(
                'vault-token.json',
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Vault token loaded from S3',
            );
        });

        it('should throw error if token not found in S3', async () => {
            mockS3Storage.getJson.mockResolvedValue(null);

            await expect(manager.initialize()).rejects.toThrow(
                'Vault token not found in S3 at key: vault-token.json',
            );
        });

        it('should refresh token if threshold reached', async () => {
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(
                    Date.now() + 12 * 60 * 60 * 1000,
                ).toISOString(), // 12 hours
                renewable: true,
                ttl: 43200,
            };

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    auth: {
                        client_token: 'hvs.renewed-token',
                        renewable: true,
                        lease_duration: 86400,
                    },
                }),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await manager.initialize();

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8200/v1/auth/token/renew-self',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-Vault-Token': 'hvs.test-token',
                    }),
                }),
            );
        });
    });

    describe('getToken', () => {
        it('should return current token', async () => {
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(
                    Date.now() + 48 * 60 * 60 * 1000,
                ).toISOString(),
                renewable: true,
                ttl: 172800,
            };

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);
            await manager.initialize();

            const token = manager.getToken();

            expect(token).toBe('hvs.test-token');
        });

        it('should throw error if not initialized', () => {
            expect(() => manager.getToken()).toThrow(
                'Vault token not initialized. Call initialize() first.',
            );
        });
    });

    describe('refreshToken', () => {
        beforeEach(async () => {
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(
                    Date.now() + 48 * 60 * 60 * 1000,
                ).toISOString(),
                renewable: true,
                ttl: 172800,
            };

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);
            await manager.initialize();
            jest.clearAllMocks();
        });

        it('should refresh token and update S3', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    auth: {
                        client_token: 'hvs.renewed-token',
                        renewable: true,
                        lease_duration: 86400,
                    },
                }),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await manager.refreshToken();

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8200/v1/auth/token/renew-self',
                expect.any(Object),
            );
            expect(mockS3Storage.putJson).toHaveBeenCalledWith(
                'vault-token.json',
                expect.objectContaining({
                    renewable: true,
                    ttl: 86400,
                }),
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Vault token refreshed and stored in S3',
            );
        });

        it('should warn if token is not renewable', async () => {
            // Initialize with non-renewable token
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(
                    Date.now() + 48 * 60 * 60 * 1000,
                ).toISOString(),
                renewable: false,
                ttl: 172800,
            };

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);
            const newManager = new VaultTokenManager(
                mockLogger,
                mockS3Storage,
                {
                    tokenS3Key: 'vault-token.json',
                },
            );
            await newManager.initialize();
            jest.clearAllMocks();

            await newManager.refreshToken();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Current Vault token is not renewable',
            );
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should handle refresh errors', async () => {
            const mockResponse = {
                ok: false,
                status: 403,
                text: jest.fn().mockResolvedValue('Permission denied'),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await expect(manager.refreshToken()).rejects.toThrow(
                'Failed to refresh token: 403 Permission denied',
            );
        });
    });

    describe('ensureValidToken', () => {
        it('should refresh if threshold is reached', async () => {
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(
                    Date.now() + 12 * 60 * 60 * 1000,
                ).toISOString(), // 12 hours
                renewable: true,
                ttl: 43200,
            };

            // Setup fetch mock BEFORE initialize (which may trigger auto-refresh)
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    auth: {
                        client_token: 'hvs.renewed-token',
                        renewable: true,
                        lease_duration: 86400,
                    },
                }),
            };
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);
            await manager.initialize();

            // Verify that fetch was called during initialize (auto-refresh)
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should not refresh if token is still valid', async () => {
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(
                    Date.now() + 48 * 60 * 60 * 1000,
                ).toISOString(),
                renewable: true,
                ttl: 172800,
            };

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);
            await manager.initialize();
            jest.clearAllMocks();

            await manager.ensureValidToken();

            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('getTokenInfo', () => {
        it('should return token expiry information', async () => {
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
            const mockTokenData: VaultTokenData = {
                token: 'hvs.test-token',
                createdAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString(),
                renewable: true,
                ttl: 172800,
            };

            mockS3Storage.getJson.mockResolvedValue(mockTokenData);
            await manager.initialize();

            const info = manager.getTokenInfo();

            expect(info).not.toBeNull();
            expect(info?.expiresAt).toBe(expiresAt.toISOString());
            expect(info?.hoursRemaining).toBeGreaterThan(47);
            expect(info?.hoursRemaining).toBeLessThan(49);
        });

        it('should return null if not initialized', () => {
            const info = manager.getTokenInfo();

            expect(info).toBeNull();
        });
    });
});
