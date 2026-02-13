import { IamKeySyncService } from './iam-key-sync.service';
import { LoggerService } from './util/logger.service';
import { VaultService } from './vault.service';
import { SSMClient } from '@aws-sdk/client-ssm';

// Mock AWS SDK
jest.mock('@aws-sdk/client-ssm');

describe('IamKeySyncService', () => {
    let service: IamKeySyncService;
    let mockLogger: jest.Mocked<LoggerService>;
    let mockVaultService: jest.Mocked<VaultService>;
    let mockSsmClient: jest.Mocked<SSMClient>;

    beforeEach(() => {
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        // Create mock Vault service
        mockVaultService = {
            postKv: jest.fn().mockResolvedValue(undefined),
            getKv: jest.fn().mockResolvedValue({}),
            patchKv: jest.fn().mockResolvedValue(undefined),
            deleteKv: jest.fn().mockResolvedValue(undefined),
            hasValidToken: jest.fn().mockReturnValue(true),
        } as any;

        // Create mock SSM client
        mockSsmClient = new SSMClient({}) as jest.Mocked<SSMClient>;

        // Create service instance
        service = new IamKeySyncService(mockLogger, mockVaultService);
        (service as any).ssmClient = mockSsmClient;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('syncKeyToVault', () => {
        it('should sync key when Vault has no key', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM response
            mockSsmClient.send = jest.fn().mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify({
                        current: {
                            AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                            SecretAccessKey:
                                'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                        },
                    }),
                },
            });

            // Mock Vault getKv to throw (no key exists)
            mockVaultService.getKv = jest
                .fn()
                .mockRejectedValue(new Error('Not found'));

            const result = await service.syncKeyToVault(
                userName,
                vaultMount,
                vaultPath,
            );

            expect(result.userName).toBe(userName);
            expect(result.success).toBe(true);
            expect(result.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
            expect(mockVaultService.postKv).toHaveBeenCalledWith(
                vaultMount,
                vaultPath,
                expect.objectContaining({
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    userName: userName,
                }),
            );
        });

        it('should sync current key when Vault has pending_deletion key', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM response with pending_deletion
            mockSsmClient.send = jest.fn().mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify({
                        current: {
                            AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                            SecretAccessKey:
                                'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                        },
                        pending_deletion: {
                            AccessKeyID: 'AKIAI44QH8DHBEXAMPLE',
                            SecretAccessKey:
                                'je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY',
                        },
                    }),
                },
            });

            // Mock Vault has pending_deletion key
            mockVaultService.getKv = jest.fn().mockResolvedValue({
                accessKeyId: 'AKIAI44QH8DHBEXAMPLE',
            });

            const result = await service.syncKeyToVault(
                userName,
                vaultMount,
                vaultPath,
            );

            expect(result.success).toBe(true);
            expect(mockVaultService.postKv).toHaveBeenCalledWith(
                vaultMount,
                vaultPath,
                expect.objectContaining({
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                }),
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Vault has pending_deletion key'),
            );
        });

        it('should skip sync when Vault already has current key', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM response
            mockSsmClient.send = jest.fn().mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify({
                        current: {
                            AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                            SecretAccessKey:
                                'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                        },
                    }),
                },
            });

            // Mock Vault already has current key
            mockVaultService.getKv = jest.fn().mockResolvedValue({
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            });

            const result = await service.syncKeyToVault(
                userName,
                vaultMount,
                vaultPath,
            );

            expect(result.success).toBe(true);
            expect(mockVaultService.postKv).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('already has current key'),
            );
        });

        it('should sync when Vault has outdated key', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM response
            mockSsmClient.send = jest.fn().mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify({
                        current: {
                            AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                            SecretAccessKey:
                                'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                        },
                    }),
                },
            });

            // Mock Vault has different key
            mockVaultService.getKv = jest.fn().mockResolvedValue({
                accessKeyId: 'AKIASOMEOTHERKEY',
            });

            const result = await service.syncKeyToVault(
                userName,
                vaultMount,
                vaultPath,
            );

            expect(result.success).toBe(true);
            expect(mockVaultService.postKv).toHaveBeenCalledWith(
                vaultMount,
                vaultPath,
                expect.objectContaining({
                    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                }),
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('outdated key'),
            );
        });

        it('should handle missing current key in SSM', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM response with no current key
            mockSsmClient.send = jest.fn().mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify({
                        pending_deletion: {
                            AccessKeyID: 'OLDKEY',
                            SecretAccessKey: 'OLDSECRET',
                        },
                    }),
                },
            });

            await expect(
                service.syncKeyToVault(userName, vaultMount, vaultPath),
            ).rejects.toThrow('No current access key found in SSM');

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to sync key'),
            );
        });

        it('should handle SSM parameter not found', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM parameter not found error
            const error = new Error('Parameter not found');
            error.name = 'ParameterNotFound';
            mockSsmClient.send = jest.fn().mockRejectedValue(error);

            await expect(
                service.syncKeyToVault(userName, vaultMount, vaultPath),
            ).rejects.toThrow('No current access key found in SSM');

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('not found in SSM'),
            );
        });

        it('should handle Vault write errors', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM response
            mockSsmClient.send = jest.fn().mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify({
                        current: {
                            AccessKeyID: 'AKIAIOSFODNN7EXAMPLE',
                            SecretAccessKey:
                                'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                        },
                    }),
                },
            });

            // Mock Vault error
            mockVaultService.postKv = jest
                .fn()
                .mockRejectedValue(new Error('Vault connection error'));

            await expect(
                service.syncKeyToVault(userName, vaultMount, vaultPath),
            ).rejects.toThrow('Vault connection error');

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to sync key'),
            );
        });

        it('should use correct SSM parameter format /iam_users/<user-name>_keys', async () => {
            const userName = 'john.doe';
            const vaultMount = 'secret';
            const vaultPath = 'aws/iam-keys/john.doe';

            // Mock SSM parameter not found error to verify parameter name format in log
            const error = new Error('Parameter not found');
            error.name = 'ParameterNotFound';
            mockSsmClient.send = jest.fn().mockRejectedValue(error);

            await expect(
                service.syncKeyToVault(userName, vaultMount, vaultPath),
            ).rejects.toThrow();

            // Verify the logger was called with the correct parameter format
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Parameter /iam_users/john.doe_keys not found in SSM',
            );
        });
    });

    describe('syncMultipleKeysToVault', () => {
        it('should sync keys for multiple users', async () => {
            const syncConfigs = [
                {
                    userName: 'john.doe',
                    vaultMount: 'secret',
                    vaultPath: 'aws/iam-keys/john.doe',
                },
                {
                    userName: 'jane.smith',
                    vaultMount: 'secret',
                    vaultPath: 'aws/iam-keys/jane.smith',
                },
            ];

            // Mock SSM responses
            mockSsmClient.send = jest
                .fn()
                .mockResolvedValueOnce({
                    Parameter: {
                        Value: JSON.stringify({
                            current: {
                                AccessKeyID: 'KEY1',
                                SecretAccessKey: 'SECRET1',
                            },
                        }),
                    },
                })
                .mockResolvedValueOnce({
                    Parameter: {
                        Value: JSON.stringify({
                            current: {
                                AccessKeyID: 'KEY2',
                                SecretAccessKey: 'SECRET2',
                            },
                        }),
                    },
                });

            const results = await service.syncMultipleKeysToVault(syncConfigs);

            expect(results).toHaveLength(2);
            expect(results[0].userName).toBe('john.doe');
            expect(results[1].userName).toBe('jane.smith');
            expect(mockVaultService.postKv).toHaveBeenCalledTimes(2);
        });

        it('should continue syncing other keys if one fails', async () => {
            const syncConfigs = [
                {
                    userName: 'john.doe',
                    vaultMount: 'secret',
                    vaultPath: 'aws/iam-keys/john.doe',
                },
                {
                    userName: 'jane.smith',
                    vaultMount: 'secret',
                    vaultPath: 'aws/iam-keys/jane.smith',
                },
            ];

            // Mock SSM responses - first user fails, second succeeds
            mockSsmClient.send = jest
                .fn()
                .mockRejectedValueOnce(new Error('User1 error'))
                .mockResolvedValueOnce({
                    Parameter: {
                        Value: JSON.stringify({
                            current: {
                                AccessKeyID: 'KEY2',
                                SecretAccessKey: 'SECRET2',
                            },
                        }),
                    },
                });

            const results = await service.syncMultipleKeysToVault(syncConfigs);

            expect(results).toHaveLength(1);
            expect(results[0].userName).toBe('jane.smith');
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to sync key for john.doe'),
            );
        });
    });
});
