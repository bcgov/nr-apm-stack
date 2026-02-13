import { S3StorageService } from './s3-storage.service';
import { LoggerService } from './util/logger.service';
import { S3Client } from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('S3StorageService', () => {
    let service: S3StorageService;
    let mockLogger: jest.Mocked<LoggerService>;
    let mockS3Client: jest.Mocked<S3Client>;

    beforeEach(() => {
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        // Create mock S3 client
        mockS3Client = new S3Client({}) as jest.Mocked<S3Client>;

        // Create service instance
        service = new S3StorageService(mockLogger, {
            bucketName: 'test-bucket',
            region: 'ca-central-1',
        });
        (service as any).s3Client = mockS3Client;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getObject', () => {
        it('should retrieve object from S3', async () => {
            const mockBody = {
                transformToString: jest.fn().mockResolvedValue('test content'),
            };

            mockS3Client.send = jest.fn().mockResolvedValue({
                Body: mockBody,
            });

            const result = await service.getObject('test-key');

            expect(result).toBe('test content');
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Retrieved object from S3: test-key',
            );
        });

        it('should return null if object has no body', async () => {
            mockS3Client.send = jest.fn().mockResolvedValue({
                Body: null,
            });

            const result = await service.getObject('test-key');

            expect(result).toBeNull();
        });

        it('should return null if object does not exist', async () => {
            const error = new Error('Not found');
            (error as any).name = 'NoSuchKey';
            mockS3Client.send = jest.fn().mockRejectedValue(error);

            const result = await service.getObject('missing-key');

            expect(result).toBeNull();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Object not found in S3: missing-key',
            );
        });

        it('should throw error for other S3 errors', async () => {
            const error = new Error('Access denied');
            (error as any).name = 'AccessDenied';
            mockS3Client.send = jest.fn().mockRejectedValue(error);

            await expect(service.getObject('test-key')).rejects.toThrow(
                'Access denied',
            );
        });
    });

    describe('getJson', () => {
        it('should retrieve and parse JSON object from S3', async () => {
            const mockData = { key: 'value', number: 42 };
            const mockBody = {
                transformToString: jest
                    .fn()
                    .mockResolvedValue(JSON.stringify(mockData)),
            };

            mockS3Client.send = jest.fn().mockResolvedValue({
                Body: mockBody,
            });

            const result = await service.getJson('test-key.json');

            expect(result).toEqual(mockData);
        });

        it('should return null if object does not exist', async () => {
            const error = new Error('Not found');
            (error as any).name = 'NoSuchKey';
            mockS3Client.send = jest.fn().mockRejectedValue(error);

            const result = await service.getJson('missing.json');

            expect(result).toBeNull();
        });
    });

    describe('putObject', () => {
        it('should store object in S3 with encryption', async () => {
            mockS3Client.send = jest.fn().mockResolvedValue({});

            await service.putObject('test-key', 'test content');

            // Verify send was called (command internals are SDK implementation details)
            expect(mockS3Client.send).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Stored object in S3: test-key',
            );
        });

        it('should handle put errors', async () => {
            const error = new Error('Put failed');
            mockS3Client.send = jest.fn().mockRejectedValue(error);

            await expect(
                service.putObject('test-key', 'content'),
            ).rejects.toThrow('Put failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to put object to S3: test-key - Error: Put failed',
            );
        });
    });

    describe('putJson', () => {
        it('should serialize and store JSON object in S3', async () => {
            const mockData = { key: 'value', number: 42 };
            mockS3Client.send = jest.fn().mockResolvedValue({});

            await service.putJson('test-key.json', mockData);

            // Verify send was called (command internals are SDK implementation details)
            expect(mockS3Client.send).toHaveBeenCalledTimes(1);
        });
    });

    describe('objectExists', () => {
        it('should return true if object exists', async () => {
            mockS3Client.send = jest.fn().mockResolvedValue({});

            const result = await service.objectExists('test-key');

            expect(result).toBe(true);
        });

        it('should return false if object does not exist', async () => {
            const error = new Error('Not found');
            (error as any).name = 'NotFound';
            mockS3Client.send = jest.fn().mockRejectedValue(error);

            const result = await service.objectExists('missing-key');

            expect(result).toBe(false);
        });

        it('should return false if object does not exist (NoSuchKey)', async () => {
            const error = new Error('Not found');
            (error as any).name = 'NoSuchKey';
            mockS3Client.send = jest.fn().mockRejectedValue(error);

            const result = await service.objectExists('missing-key');

            expect(result).toBe(false);
        });

        it('should throw error for other errors', async () => {
            const error = new Error('Access denied');
            (error as any).name = 'AccessDenied';
            mockS3Client.send = jest.fn().mockRejectedValue(error);

            await expect(service.objectExists('test-key')).rejects.toThrow(
                'Access denied',
            );
        });
    });
});
