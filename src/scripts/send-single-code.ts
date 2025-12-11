import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';
import { input } from '@inquirer/prompts';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  console.log('📧 Send Single Access Code\n');

  // Ask for recipient details
  const recipientEmail = await input({
    message: 'Recipient email:',
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Please enter a valid email';
    },
  });

  const accessCode = await input({
    message: 'Access code:',
    validate: (value) => value.length > 0 || 'Please enter an access code',
  });

  console.log('\n📧 Preparing to send to:', recipientEmail);
  console.log('🔑 Access code:', accessCode);

  // Create AWS SES transporter
  const transporter = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.AWS_SES_SMTP_USERNAME,
      pass: process.env.AWS_SES_SMTP_PASSWORD,
    },
  });

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
        <div class="code">${accessCode}</div>
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
      <p>This email was sent to ${recipientEmail}</p>
    </div>
  </div>
</body>
</html>
  `;

  const logoPath = path.join(__dirname, '../../assets/skepsis_logo.png');

  try {
    console.log('\n📤 Sending email...\n');
    
    await transporter.sendMail({
      from: `"Pal from Skepsis" <${process.env.AWS_SES_FROM_EMAIL}>`,
      to: recipientEmail,
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

    console.log('✅ Email sent successfully!\n');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Error:', error);
  process.exit(1);
});
