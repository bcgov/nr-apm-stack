import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { LoggerService } from './util/logger.service';

export interface S3StorageConfig {
    bucketName: string;
    region?: string;
}

/**
 * Service for managing encrypted S3 storage
 * Used for storing internal state like Vault tokens and sync metadata
 */
export class S3StorageService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(
        private logger: LoggerService,
        config: S3StorageConfig,
    ) {
        const region =
            config.region || process.env.AWS_DEFAULT_REGION || 'ca-central-1';
        const credentials = defaultProvider();

        this.s3Client = new S3Client({ region, credentials });
        this.bucketName = config.bucketName;
    }

    /**
     * Get an object from the encrypted S3 bucket
     * @param key The S3 object key
     * @returns The object content as a string, or null if not found
     */
    async getObject(key: string): Promise<string | null> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            const response = await this.s3Client.send(command);

            if (!response.Body) {
                return null;
            }

            const bodyContents = await response.Body.transformToString();
            this.logger.debug(`Retrieved object from S3: ${key}`);
            return bodyContents;
        } catch (error) {
            if ((error as any).name === 'NoSuchKey') {
                this.logger.debug(`Object not found in S3: ${key}`);
                return null;
            }
            this.logger.error(
                `Failed to get object from S3: ${key} - ${error}`,
            );
            throw error;
        }
    }

    /**
     * Get a JSON object from the encrypted S3 bucket
     * @param key The S3 object key
     * @returns The parsed JSON object, or null if not found
     */
    async getJson<T = any>(key: string): Promise<T | null> {
        const content = await this.getObject(key);
        if (!content) {
            return null;
        }
        return JSON.parse(content) as T;
    }

    /**
     * Put an object into the encrypted S3 bucket
     * @param key The S3 object key
     * @param content The content to store
     */
    async putObject(key: string, content: string): Promise<void> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: content,
                ServerSideEncryption: 'AES256',
            });

            await this.s3Client.send(command);
            this.logger.info(`Stored object in S3: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to put object to S3: ${key} - ${error}`);
            throw error;
        }
    }

    /**
     * Put a JSON object into the encrypted S3 bucket
     * @param key The S3 object key
     * @param data The data to serialize and store
     */
    async putJson(key: string, data: any): Promise<void> {
        const content = JSON.stringify(data, null, 2);
        await this.putObject(key, content);
    }

    /**
     * Check if an object exists in the bucket
     * @param key The S3 object key
     * @returns True if the object exists
     */
    async objectExists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            if (
                (error as any).name === 'NotFound' ||
                (error as any).name === 'NoSuchKey'
            ) {
                return false;
            }
            throw error;
        }
    }
}
