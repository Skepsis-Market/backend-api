import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import * as inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { generateAccessCode } from '../common/utils/code-generator.util';

// Load environment variables
dotenv.config();

interface WaitlistEntry {
  _id: string;
  contact: string;
  contact_raw: string;
  platform: string;
  access_code?: string;
  persona?: string[];
  status: string;
}

const WaitlistSchema = new mongoose.Schema({
  contact: String,
  contact_raw: String,
  platform: String,
  access_code: String,
  persona: [String],
  wallet_address: String,
  status: String,
  approved_at: Date,
  used_at: Date,
}, { timestamps: true });

async function main() {
  console.log('🎫 Skepsis Access Code Generator\n');

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skepsis';
  console.log(`📊 Connecting to MongoDB: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const Waitlist = mongoose.model('waitlists', WaitlistSchema);

  // Fetch pending entries
  const pendingEntries = await Waitlist.find({ status: 'pending' });
  
  if (pendingEntries.length === 0) {
    console.log('❌ No pending waitlist entries found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📋 Found ${pendingEntries.length} pending waitlist entries\n`);

  // Ask user what to do
  const { action } = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: `Generate codes for ALL ${pendingEntries.length} entries`, value: 'all' },
        { name: 'Select specific entries', value: 'select' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'exit') {
    await mongoose.disconnect();
    process.exit(0);
  }

  let selectedEntries: any[] = [];

  if (action === 'all') {
    selectedEntries = pendingEntries;
  } else {
    // Show list of pending entries
    const choices = pendingEntries.map((entry: any) => ({
      name: `${entry.contact_raw} (${entry.platform})`,
      value: entry._id.toString(),
    }));

    const { selected } = await inquirer.default.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select entries to generate codes for:',
        choices,
      },
    ]);

    selectedEntries = pendingEntries.filter((e: any) => 
      selected.includes(e._id.toString())
    );
  }

  if (selectedEntries.length === 0) {
    console.log('❌ No entries selected.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Ask for persona assignment
  const { personaType } = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'personaType',
      message: `Assign persona to ${selectedEntries.length} entries:`,
      choices: [
        { name: 'Trader', value: ['trader'] },
        { name: 'LP (Liquidity Provider)', value: ['lp'] },
        { name: 'Both (Trader + LP)', value: ['trader', 'lp'] },
        { name: 'No persona (null)', value: null },
      ],
    },
  ]);

  console.log(`\n🔄 Generating access codes...\n`);

  const results: any[] = [];
  const existingCodes = new Set(
    (await Waitlist.find({ access_code: { $ne: null } }))
      .map((e: any) => e.access_code)
  );

  for (const entry of selectedEntries) {
    // Generate unique code
    let code = generateAccessCode();
    while (existingCodes.has(code)) {
      code = generateAccessCode();
    }
    existingCodes.add(code);

    // Update entry
    await Waitlist.updateOne(
      { _id: entry._id },
      {
        $set: {
          access_code: code,
          persona: personaType,
          status: 'approved',
          approved_at: new Date(),
        },
      }
    );

    results.push({
      contact: entry.contact_raw,
      platform: entry.platform,
      code,
      persona: personaType ? personaType.join(', ') : 'none',
    });

    console.log(`✅ ${entry.contact_raw} → ${code}`);
  }

  // Export to CSV
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `access-codes-${timestamp}.csv`;
  const filepath = path.join(process.cwd(), filename);

  const csvHeader = 'Contact,Platform,Access Code,Persona\n';
  const csvRows = results.map(r => 
    `${r.contact},${r.platform},${r.code},${r.persona}`
  ).join('\n');

  fs.writeFileSync(filepath, csvHeader + csvRows);

  console.log(`\n📄 Exported to: ${filename}`);
  console.log(`✅ Generated ${results.length} access codes\n`);

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
