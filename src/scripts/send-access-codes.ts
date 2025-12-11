import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import * as nodemailer from 'nodemailer';
import { input, confirm } from '@inquirer/prompts';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

interface WaitlistEntry {
  _id: string;
  email?: string;
  newsletter_consent?: boolean;
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
  console.log('📧 Skepsis Access Code Email Sender\n');

  // Check for required environment variables
  const requiredEnvVars = [
    'AWS_SES_SMTP_USERNAME',
    'AWS_SES_SMTP_PASSWORD',
    'AWS_SES_FROM_EMAIL',
    'MONGODB_URI',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease add these to your .env file:');
    console.error('AWS_SES_SMTP_USERNAME=your-aws-ses-smtp-username');
    console.error('AWS_SES_SMTP_PASSWORD=your-aws-ses-smtp-password');
    console.error('AWS_SES_FROM_EMAIL=team@skepsis.live');
    process.exit(1);
  }

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skepsis';
  console.log(`📊 Connecting to MongoDB: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const Waitlist = mongoose.model('waitlists', WaitlistSchema);

  // Find approved entries with email addresses that haven't been shared
  const allUnsharedEntries = await Waitlist.find({
    email: { $exists: true, $ne: null },
    access_code: { $exists: true, $ne: null },
    status: 'approved',
    $or: [
      { isShared: { $exists: false } },
      { isShared: false },
    ],
  }).lean();

  // Filter out invalid emails and mark them
  const invalidEmailEntries: any[] = [];
  const unsharedEmailEntries: any[] = [];

  for (const entry of allUnsharedEntries) {
    const typedEntry = entry as any;
    if (!isValidEmail(typedEntry.email)) {
      invalidEmailEntries.push(typedEntry);
    } else {
      unsharedEmailEntries.push(typedEntry);
    }
  }

  // Mark invalid emails in database
  if (invalidEmailEntries.length > 0) {
    console.log(`⚠️  Found ${invalidEmailEntries.length} invalid email(s):\n`);
    invalidEmailEntries.forEach((entry: any, index: number) => {
      console.log(`${index + 1}. ${entry.email} - Code: ${entry.access_code}`);
    });
    console.log('\n❌ Marking these as shared with "invalid-email" tag...\n');
    
    for (const entry of invalidEmailEntries) {
      await Waitlist.updateOne(
        { _id: entry._id },
        { 
          isShared: true, 
          shared_at: new Date(),
          shared_by: 'invalid-email',
        }
      );
    }
    console.log('✅ Invalid emails marked.\n');
  }

  if (unsharedEmailEntries.length === 0) {
    console.log('✅ No valid unshared email entries found. All access codes have been sent!');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📬 Found ${unsharedEmailEntries.length} valid email(s) with unshared access codes:\n`);
  
  unsharedEmailEntries.forEach((entry: any, index: number) => {
    console.log(`${index + 1}. ${entry.email} - Code: ${entry.access_code}`);
  });

  console.log('');

  // Confirm before sending
  const shouldSend = await confirm({
    message: `Send access codes to these ${unsharedEmailEntries.length} email(s)?`,
    default: false,
  });

  if (!shouldSend) {
    console.log('❌ Cancelled. No emails sent.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Create AWS SES transporter
  console.log(`📧 Using AWS SES from: ${process.env.AWS_SES_FROM_EMAIL}`);
  console.log(`🔑 SMTP Username: ${process.env.AWS_SES_SMTP_USERNAME}`);
  console.log(`🌐 SMTP Host: email-smtp.us-east-1.amazonaws.com:587\n`);
  
  const transporter = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.AWS_SES_SMTP_USERNAME,
      pass: process.env.AWS_SES_SMTP_PASSWORD,
    },
  });

  // Verify transporter
  console.log('\n🔐 Verifying email credentials...');
  try {
    await transporter.verify();
    console.log('✅ Email credentials verified\n');
  } catch (error) {
    console.error('❌ Email verification failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Send emails
  console.log('📤 Sending emails...\n');
  
  let successCount = 0;
  let failCount = 0;

  for (const entry of unsharedEmailEntries) {
    const typedEntry = entry as any;
    
    try {
      // Email template
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px;
      margin: 40px auto;
      padding: 0;
      background: #ffffff;
    }
    .logo-container {
      text-align: center;
      padding: 16px 0;
      background: #25222a;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .logo-img {
      height: 24px;
      width: auto;
      display: block;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      line-height: 24px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .content { 
      padding: 20px 40px 30px 40px;
      color: #1a1a1a;
    }
    .content p {
      margin: 0 0 12px 0;
      font-size: 15px;
      line-height: 1.6;
    }
    .code-section {
      margin: 20px 0;
      padding: 20px;
      background: #25222a;
      border-left: 4px solid #abe172;
    }
    .code-label {
      font-size: 12px;
      font-weight: 600;
      color: #abe172;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .code { 
      font-size: 26px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
    }
    .cta-button {
      display: inline-block;
      margin: 20px 0;
      padding: 12px 28px;
      background: #25222a !important;
      color: #abe172 !important;
      text-decoration: none !important;
      font-weight: 600;
      font-size: 15px;
      border: 2px solid #abe172;
      border-radius: 4px;
    }
    .signature {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
    .signature p {
      margin: 3px 0;
    }
    .founder-name {
      font-weight: 600;
      color: #000000;
    }
    .footer { 
      text-align: center;
      color: #999;
      font-size: 12px;
      padding: 20px 40px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <img src="cid:logo" alt="SKEPSIS" class="logo-img" />
      <span class="logo-text">SKEPSIS</span>
    </div>
    
    <div class="content">
      <p>Hey Explorer,</p>
      
      <p>Thanks for waiting.</p>
      
      <p>You joined the waitlist because you know binary markets are blunt instruments. You saw the gaps, the lost precision, the wasted alpha.</p>
      
      <p>You're among the first to test what we built.</p>
      
      <div class="code-section">
        <div class="code-label">Your Access Code</div>
        <div class="code">${typedEntry.access_code}</div>
      </div>
      
      <p>No gas, no wallet setup, no risk. Just sign in with Google and start predicting.</p>
      
      <div style="text-align: center;">
        <a href="https://skepsis.live" class="cta-button">Start Trading →</a>
      </div>
      
      <p>Reply and let me know what you think.</p>
      
      <div class="signature">
        <p>Best,</p>
        <p class="founder-name">Pal</p>
        <p style="color: #666; font-size: 14px;">Founder, Skepsis</p>
      </div>
    </div>
    
    <div class="footer">
      <p>This email was sent to ${typedEntry.email}</p>
    </div>
  </div>
</body>
</html>
      `;

      // Prepare logo attachment
      const logoPath = path.join(__dirname, '../../assets/skepsis_logo.png');
      
      // Send email
      await transporter.sendMail({
        from: `"Pal from Skepsis" <${process.env.AWS_SES_FROM_EMAIL}>`,
        to: typedEntry.email,
        replyTo: process.env.AWS_SES_FROM_EMAIL,
        subject: "You're in.",
        html: emailHtml,
        attachments: [
          {
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo',
          }
        ],
      });

      // Mark as shared in database
      await Waitlist.updateOne(
        { _id: typedEntry._id },
        { 
          isShared: true, 
          shared_at: new Date(),
          shared_by: 'email-automation',
        }
      );

      console.log(`✅ Sent to: ${typedEntry.email}`);
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to send to ${typedEntry.email}:`, error instanceof Error ? error.message : error);
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 SUMMARY:');
  console.log(`✅ Successfully sent: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('═══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

main().catch((error) => {
  console.error('💥 Error:', error);
  process.exit(1);
});
