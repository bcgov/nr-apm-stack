#!/usr/bin/env ts-node
/**
 * Local integration test for enhanced IAM key sync with S3 state tracking
 *
 * Prerequisites:
 * - AWS credentials configured
 * - S3 bucket created with Vault token (run scripts/setup-aws-test-resources.sh)
 * - Vault write-only policy configured (run scripts/setup-vault-test-resources.sh)
 * - Vault token uploaded to S3
 *
 * Usage:
 *   npx ts-node scripts/test-enhanced-local.ts
 */

import * as dotenv from 'dotenv';
import { createEnhancedIamKeySyncService } from '../src';

// Load environment variables
dotenv.config();

const TEST_USER = process.env.TEST_USER || 'testuser';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const VAULT_TOKEN_S3_KEY = process.env.VAULT_TOKEN_S3_KEY || 'vault-token.json';
const SYNC_STATE_S3_KEY = process.env.SYNC_STATE_S3_KEY || 'sync-state.json';
const VAULT_MOUNT = process.env.VAULT_MOUNT || 'secret';
const VAULT_PATH_PREFIX = process.env.VAULT_PATH_PREFIX || 'aws/iam-keys';

async function testEnhancedSync() {
    console.log('=== Testing Enhanced IAM Key Sync ===\n');

    // Verify required environment variables
    if (!S3_BUCKET_NAME) {
        console.error('❌ S3_BUCKET_NAME not set in .env file');
        console.error('   Run scripts/setup-aws-test-resources.sh first');
        process.exit(1);
    }

    console.log('Configuration:');
    console.log(`  Test User: ${TEST_USER}`);
    console.log(`  S3 Bucket: ${S3_BUCKET_NAME}`);
    console.log(`  Vault Token S3 Key: ${VAULT_TOKEN_S3_KEY}`);
    console.log(`  Sync State S3 Key: ${SYNC_STATE_S3_KEY}`);
    console.log(`  Vault Mount: ${VAULT_MOUNT}`);
    console.log(`  Vault Path Prefix: ${VAULT_PATH_PREFIX}`);
    console.log();

    try {
        const service = createEnhancedIamKeySyncService({
            s3BucketName: S3_BUCKET_NAME,
            vaultTokenS3Key: VAULT_TOKEN_S3_KEY,
            syncStateS3Key: SYNC_STATE_S3_KEY,
            vaultMount: VAULT_MOUNT,
            vaultPathPrefix: VAULT_PATH_PREFIX,
        });

        console.log('Initializing service (loading Vault token from S3)...');
        await service.initialize();
        console.log('✅ Initialized\n');

        // First sync - should write to Vault
        console.log('--- First Sync (should write to Vault) ---');
        const results1 = await service.runSync([TEST_USER]);
        console.log('Results:', JSON.stringify(results1, null, 2));

        // Second sync - should skip (no changes, within 24h)
        console.log('\n--- Second Sync (should skip - no changes) ---');
        const results2 = await service.runSync([TEST_USER]);
        console.log('Results:', JSON.stringify(results2, null, 2));

        console.log('\n✅ Enhanced sync test complete\n');

        console.log('Verification steps:');
        console.log(`  1. Check state in S3:`);
        console.log(`     aws s3 cp s3://${S3_BUCKET_NAME}/${SYNC_STATE_S3_KEY} - | jq .`);
        console.log(`  2. Verify secret in Vault (requires admin token):`);
        console.log(`     vault kv get ${VAULT_MOUNT}/${VAULT_PATH_PREFIX}/${TEST_USER}`);
        console.log();
        console.log('State file should contain:');
        console.log('  - lastSecretHash (SHA-256 hash, not the actual keys)');
        console.log('  - lastSyncedAt (timestamp)');
        console.log('  - userName');

    } catch (error) {
        console.error('\n❌ Enhanced sync failed:');
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            if (error.stack) {
                console.error('\nStack trace:');
                console.error(error.stack);
            }
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

testEnhancedSync();
