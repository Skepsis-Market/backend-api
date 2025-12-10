// ================================================
// Standalone Migration Script
// ================================================
// This script can be run independently to perform
// database migrations without full deployment
// 
// Usage: MONGODB_URI=your_uri node migration-standalone.js
// ================================================

const { MongoClient } = require('mongodb');

async function migrate() {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI environment variable not set');
        console.error('Usage: MONGODB_URI=mongodb://... node migration-standalone.js');
        process.exit(1);
    }
    
    console.log('🔌 Connecting to MongoDB...');
    const client = await MongoClient.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    const db = client.db();
    
    console.log('✅ Connected to database:', db.databaseName);
    console.log('');
    
    // ================================================
    // Migration 1: Waitlist - Email System
    // ================================================
    console.log('📋 Migration 1: Waitlist email system');
    console.log('─────────────────────────────────────────');
    
    try {
        // Check current state
        const waitlistCount = await db.collection('waitlist').countDocuments();
        console.log(`Total waitlist entries: ${waitlistCount}`);
        
        // Drop old contact unique index
        console.log('\n🔄 Dropping old contact unique index...');
        try {
            await db.collection('waitlist').dropIndex('contact_1');
            console.log('✅ Dropped contact_1 index');
        } catch (e) {
            console.log('ℹ️  Index already dropped or does not exist');
        }
        
        // Create new email index (sparse to allow old entries)
        console.log('\n📝 Creating new email index...');
        await db.collection('waitlist').createIndex(
            { email: 1 }, 
            { unique: true, sparse: true }
        );
        console.log('✅ Created email_1 index (unique, sparse)');
        
        // Add newsletter_consent to existing entries
        console.log('\n🔄 Adding newsletter_consent to existing entries...');
        const result1 = await db.collection('waitlist').updateMany(
            { newsletter_consent: { $exists: false } },
            { $set: { newsletter_consent: false } }
        );
        console.log(`✅ Updated ${result1.modifiedCount} documents`);
        
        // Show indexes
        console.log('\n📊 Current indexes:');
        const waitlistIndexes = await db.collection('waitlist').indexes();
        waitlistIndexes.forEach(idx => {
            console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        
    } catch (error) {
        console.error('❌ Error in waitlist migration:', error.message);
        throw error;
    }
    
    console.log('\n');
    
    // ================================================
    // Migration 2: User Positions - PnL Fields
    // ================================================
    console.log('📋 Migration 2: User positions PnL fields');
    console.log('─────────────────────────────────────────');
    
    let positionsCount = 0;
    try {
        positionsCount = await db.collection('user_positions').countDocuments();
        console.log(`Total user positions: ${positionsCount}`);
        
        // Add unrealized_pnl field to existing positions
        console.log('\n🔄 Adding unrealized_pnl field...');
        const result2 = await db.collection('user_positions').updateMany(
            { unrealized_pnl: { $exists: false } },
            { $set: { unrealized_pnl: '0' } }
        );
        console.log(`✅ Updated ${result2.modifiedCount} documents`);
        
        // close_reason is optional, no migration needed
        console.log('ℹ️  close_reason field is optional, no action needed');
        
        // Show sample document
        console.log('\n📊 Sample document:');
        const samplePosition = await db.collection('user_positions').findOne();
        if (samplePosition) {
            console.log('   Keys:', Object.keys(samplePosition).join(', '));
            console.log('   Has unrealized_pnl:', 'unrealized_pnl' in samplePosition ? '✅' : '❌');
        }
        
    } catch (error) {
        console.error('❌ Error in user_positions migration:', error.message);
        throw error;
    }
    
    console.log('\n');
    
    // ================================================
    // Migration 3: Position Events - Realized PnL
    // ================================================
    console.log('📋 Migration 3: Position events realized PnL');
    console.log('─────────────────────────────────────────');
    
    let eventsCount = 0;
    try {
        eventsCount = await db.collection('position_events').countDocuments();
        console.log(`Total position events: ${eventsCount}`);
        
        // realized_pnl_delta is optional, no migration needed
        console.log('ℹ️  realized_pnl_delta field is optional, no action needed');
        console.log('ℹ️  New events from indexer will include this field');
        
        // Check how many already have it
        const withRealizedPnl = await db.collection('position_events').countDocuments({
            realized_pnl_delta: { $exists: true }
        });
        console.log(`Events with realized_pnl_delta: ${withRealizedPnl} / ${eventsCount}`);
        
    } catch (error) {
        console.error('❌ Error in position_events migration:', error.message);
        throw error;
    }
    
    console.log('\n');
    
    // ================================================
    // Final Verification
    // ================================================
    console.log('🔍 Final Verification');
    console.log('─────────────────────────────────────────');
    
    // Check indexes
    const waitlistIndexes = await db.collection('waitlist').indexes();
    const hasEmailIndex = waitlistIndexes.some(idx => idx.key.email === 1);
    const hasOldContactIndex = waitlistIndexes.some(idx => 
        idx.key.contact === 1 && idx.unique === true && !idx.sparse
    );
    
    console.log('✅ Verification Results:');
    console.log(`   Email index exists: ${hasEmailIndex ? '✅' : '❌'}`);
    console.log(`   Old contact index removed: ${!hasOldContactIndex ? '✅' : '⚠️  Still exists'}`);
    
    // Check field presence (recount to avoid scope issues)
    const positionsTotal = await db.collection('user_positions').countDocuments();
    const waitlistTotal = await db.collection('waitlist').countDocuments();
    
    const withUnrealizedPnl = await db.collection('user_positions').countDocuments({
        unrealized_pnl: { $exists: true }
    });
    const withNewsletter = await db.collection('waitlist').countDocuments({
        newsletter_consent: { $exists: true }
    });
    
    console.log(`   Positions with unrealized_pnl: ${withUnrealizedPnl} / ${positionsTotal}`);
    console.log(`   Waitlist with newsletter_consent: ${withNewsletter} / ${waitlistTotal}`);
    
    console.log('\n');
    console.log('✅ All migrations completed successfully!');
    console.log('');
    
    await client.close();
}

// Run migration
console.log('');
console.log('================================================');
console.log('  Skepsis Backend - Database Migration');
console.log('================================================');
console.log('');

migrate()
    .then(() => {
        console.log('✅ Migration script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('💥 Migration failed:', error);
        console.error('');
        console.error('Rollback may be required. Check your database backup.');
        process.exit(1);
    });
