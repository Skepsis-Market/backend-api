import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

// Load environment variables
dotenv.config();

interface WaitlistEntry {
  _id: string;
  contact: string;
  contact_raw: string;
  platform: string;
  access_code?: string;
  persona?: string[];
  wallet_addresses?: string[];
  status: string;
  approved_at?: Date;
  used_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new mongoose.Schema({
  contact: String,
  contact_raw: String,
  platform: String,
  access_code: String,
  persona: [String],
  wallet_addresses: [String],
  status: String,
  approved_at: Date,
  used_at: Date,
}, { timestamps: true });

async function main() {
  console.log('📋 Skepsis Waitlist Viewer\n');

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skepsis';
  console.log(`📊 Connecting to MongoDB: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const Waitlist = mongoose.model('waitlists', WaitlistSchema);

  // Get all entries
  const allEntries = await Waitlist.find().sort({ createdAt: -1 });

  if (allEntries.length === 0) {
    console.log('❌ No waitlist entries found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Group by status
  const pending = allEntries.filter((e: any) => e.status === 'pending');
  const approved = allEntries.filter((e: any) => e.status === 'approved');
  const used = allEntries.filter((e: any) => e.status === 'used');

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
  console.log(`✅ Approved: ${approved.length}`);
  console.log(`🔒 Used:     ${used.length}`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`💼 Connected Wallets: ${totalWallets} (${uniqueWallets} unique)`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Display PENDING entries
  if (pending.length > 0) {
    console.log('⏳ PENDING WAITLIST REQUESTS:\n');
    console.log('┌────┬─────────────────────────┬───────────┬─────────────────────┐');
    console.log('│ #  │ Contact                 │ Platform  │ Requested At        │');
    console.log('├────┼─────────────────────────┼───────────┼─────────────────────┤');
    
    pending.forEach((entry: any, index: number) => {
      const num = String(index + 1).padEnd(2);
      const contact = entry.contact_raw.padEnd(23);
      const platform = entry.platform.padEnd(9);
      const date = new Date(entry.createdAt).toLocaleString().padEnd(19);
      console.log(`│ ${num} │ ${contact} │ ${platform} │ ${date} │`);
    });
    
    console.log('└────┴─────────────────────────┴───────────┴─────────────────────┘\n');
  }

  // Display APPROVED entries
  if (approved.length > 0) {
    console.log('✅ APPROVED (With Access Codes):\n');
    console.log('┌────┬─────────────────────────┬────────────┬──────────────┬────────────┐');
    console.log('│ #  │ Contact                 │ Code       │ Persona      │ Approved   │');
    console.log('├────┼─────────────────────────┼────────────┼──────────────┼────────────┤');
    
    approved.forEach((entry: any, index: number) => {
      const num = String(index + 1).padEnd(2);
      const contact = entry.contact_raw.padEnd(23);
      const code = (entry.access_code || 'N/A').padEnd(10);
      const persona = (entry.persona?.join(', ') || 'none').padEnd(12);
      const date = new Date(entry.approved_at).toLocaleDateString().padEnd(10);
      console.log(`│ ${num} │ ${contact} │ ${code} │ ${persona} │ ${date} │`);
    });
    
    console.log('└────┴─────────────────────────┴────────────┴──────────────┴────────────┘\n');
  }

  // Display USED entries
  if (used.length > 0) {
    console.log('🔒 USED (Active Users):\n');
    console.log('┌────┬─────────────────────────┬────────────┬──────────────┬───────┬──────────────────────┐');
    console.log('│ #  │ Contact                 │ Code       │ Persona      │ Count │ Wallets              │');
    console.log('├────┼─────────────────────────┼────────────┼──────────────┼───────┼──────────────────────┤');
    
    used.forEach((entry: any, index: number) => {
      const num = String(index + 1).padEnd(2);
      const contact = entry.contact_raw.padEnd(23);
      const code = (entry.access_code || 'N/A').padEnd(10);
      const persona = (entry.persona?.join(', ') || 'none').padEnd(12);
      const count = String(entry.wallet_addresses?.length || 0).padEnd(5);
      const wallets = entry.wallet_addresses?.length > 0 
        ? entry.wallet_addresses.map((w: string) => w.slice(0, 10) + '...').join(', ').slice(0, 20)
        : 'None';
      const walletsStr = wallets.padEnd(20);
      console.log(`│ ${num} │ ${contact} │ ${code} │ ${persona} │ ${count} │ ${walletsStr} │`);
    });
    
    console.log('└────┴─────────────────────────┴────────────┴──────────────┴───────┴──────────────────────┘\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
