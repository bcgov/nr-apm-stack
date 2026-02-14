#!/usr/bin/env ts-node
/**
 * Local integration test for basic IAM key sync
 *
 * Prerequisites:
 * - AWS credentials configured
 * - VAULT_ADDR and VAULT_TOKEN set in .env
 * - Test SSM parameter exists (run scripts/setup-aws-test-resources.sh)
 * - Vault write-only policy configured (run scripts/setup-vault-test-resources.sh)
 *
 * Usage:
 *   npx ts-node scripts/test-basic-local.ts
 */

import * as dotenv from 'dotenv';
import { createIamKeySyncService } from '../src';

// Load environment variables
dotenv.config();

const TEST_USER = process.env.TEST_USER || 'testuser';
const VAULT_MOUNT = process.env.VAULT_MOUNT || 'secret';
const VAULT_PATH_PREFIX = process.env.VAULT_PATH_PREFIX || 'aws/iam-keys';

async function testBasicSync() {
    console.log('=== Testing Basic IAM Key Sync ===\n');

    // Verify required environment variables
    const required = ['VAULT_ADDR', 'VAULT_TOKEN'];
    const missing = required.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('   Create .env file from .env.example');
        process.exit(1);
    }

    console.log('Configuration:');
    console.log(`  Test User: ${TEST_USER}`);
    console.log(`  Vault: ${process.env.VAULT_ADDR}`);
    console.log(`  Mount: ${VAULT_MOUNT}`);
    console.log(`  Path: ${VAULT_PATH_PREFIX}/${TEST_USER}`);
    console.log();

    try {
        const service = createIamKeySyncService();

        console.log('Starting sync...');
        const result = await service.syncKeyToVault(
            TEST_USER,
            VAULT_MOUNT,
            `${VAULT_PATH_PREFIX}/${TEST_USER}`
        );

        console.log('\n✅ Sync successful!');
        console.log(`   User: ${result.userName}`);
        console.log(`   Access Key ID: ${result.accessKeyId}`);
        console.log(`   Synced At: ${result.syncedAt.toISOString()}`);
        console.log();

        console.log('To verify the secret was written to Vault:');
        console.log(`  vault kv get ${VAULT_MOUNT}/${VAULT_PATH_PREFIX}/${TEST_USER}`);
        console.log();
        console.log('Note: The test token has write-only access, so it cannot read the secret.');
        console.log('Use an admin token to verify.');

    } catch (error) {
        console.error('\n❌ Sync failed:');
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

testBasicSync();
