import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

// Load environment variables
dotenv.config();

interface WaitlistEntry {
  _id: string;
  // New email-based fields
  email?: string;
  newsletter_consent?: boolean;
  // Legacy fields (optional for backward compatibility)
  contact?: string;
  contact_raw?: string;
  platform?: string;
  access_code?: string;
  persona?: string[];
  wallet_addresses?: string[];
  status: string;
  approved_at?: Date;
  used_at?: Date;
  isShared?: boolean;
  shared_at?: Date;
  shared_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new mongoose.Schema({
  email: String,
  newsletter_consent: Boolean,
  contact: String,
  contact_raw: String,
  platform: String,
  access_code: String,
  persona: [String],
  wallet_addresses: [String],
  status: String,
  approved_at: Date,
  used_at: Date,
  isShared: Boolean,
  shared_at: Date,
  shared_by: String,
}, { timestamps: true });

async function main() {
  console.log('📋 Skepsis Waitlist Viewer\n');

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skepsis';
  console.log(`📊 Connecting to MongoDB: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const Waitlist = mongoose.model('waitlists', WaitlistSchema);

  // Get only email-based entries (filter out legacy contact entries)
  const allEntries = await Waitlist.find({ email: { $exists: true, $ne: null } }).sort({ createdAt: -1 });

  if (allEntries.length === 0) {
    console.log('❌ No email waitlist entries found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Group by status
  const pending = allEntries.filter((e: any) => e.status === 'pending');
  const approved = allEntries.filter((e: any) => e.status === 'approved');
  const used = allEntries.filter((e: any) => e.status === 'used');
  const shared = allEntries.filter((e: any) => e.isShared === true);
  const approvedNotShared = allEntries.filter((e: any) => e.status === 'approved' && !e.isShared);

  // Count wallets
  const totalWallets = allEntries.reduce((sum: number, e: any) => {
    return sum + (e.wallet_addresses?.length || 0);
  }, 0);
  const uniqueWallets = new Set(
    allEntries.flatMap((e: any) => e.wallet_addresses || [])
  ).size;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 TOTAL ENTRIES: ${allEntries.length}`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`⏳ Pending:  ${pending.length}`);
  console.log(`✅ Approved: ${approved.length} (${approvedNotShared.length} not shared)`);
  console.log(`🔒 Used:     ${used.length}`);
  console.log(`📤 Shared:   ${shared.length}`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`💼 Connected Wallets: ${totalWallets} (${uniqueWallets} unique)`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Display PENDING entries
  if (pending.length > 0) {
    console.log('⏳ PENDING WAITLIST REQUESTS:\n');
    console.log('┌────┬───────────────────────────────┬───────────┬─────────────────────┐');
    console.log('│ #  │ Contact/Email                 │ Platform  │ Requested At        │');
    console.log('├────┼───────────────────────────────┼───────────┼─────────────────────┤');
    
    pending.forEach((entry: any, index: number) => {
      const num = String(index + 1).padEnd(2);
      const contact = (entry.email || 'N/A').padEnd(29);
      const platform = 'email'.padEnd(9);
      const date = new Date(entry.createdAt).toLocaleString().padEnd(19);
      console.log(`│ ${num} │ ${contact} │ ${platform} │ ${date} │`);
    });
    
    console.log('└────┴─────────────────────────┴───────────┴─────────────────────┘\n');
  }

  // Skip approved and used tables - just show counts above

  console.log('═══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
