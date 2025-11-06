import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Waitlist, WaitlistDocument } from '../modules/waitlist/schemas/waitlist.schema';
import { Position, PositionDocument } from '../modules/portfolio/schemas/position.schema';
import { Trade, TradeDocument } from '../modules/portfolio/schemas/trade.schema';
import { Sponsorship, SponsorshipDocument } from '../modules/enoki/schemas/sponsorship.schema';

interface WalletStats {
  total_unique_wallets: number;
  waitlist_wallets: number;
  trading_wallets: number;
  sponsored_wallets: number;
  wallets: string[];
}

async function extractAllWallets() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get all models
    const waitlistModel = app.get<Model<WaitlistDocument>>('WaitlistModel');
    const positionModel = app.get<Model<PositionDocument>>('PositionModel');
    const tradeModel = app.get<Model<TradeDocument>>('TradeModel');
    const sponsorshipModel = app.get<Model<SponsorshipDocument>>('SponsorshipModel');

    console.log('🔍 Extracting all connected wallets...\n');

    // Set to store unique wallet addresses
    const allWallets = new Set<string>();
    const waitlistWallets = new Set<string>();
    const tradingWallets = new Set<string>();
    const sponsoredWallets = new Set<string>();

    // 1. Extract from Waitlist (wallet_addresses array)
    console.log('📝 Checking waitlist wallet addresses...');
    const waitlistUsers = await waitlistModel.find({
      wallet_addresses: { $exists: true, $ne: [] }
    }).select('wallet_addresses contact status');

    waitlistUsers.forEach(user => {
      if (user.wallet_addresses && user.wallet_addresses.length > 0) {
        user.wallet_addresses.forEach(wallet => {
          if (wallet && wallet.trim()) {
            allWallets.add(wallet.trim());
            waitlistWallets.add(wallet.trim());
          }
        });
      }
    });

    console.log(`   Found ${waitlistWallets.size} unique wallets from waitlist`);

    // 2. Extract from Positions (user field)
    console.log('📊 Checking position user addresses...');
    const positions = await positionModel.distinct('user');
    
    positions.forEach(wallet => {
      if (wallet && wallet.trim()) {
        allWallets.add(wallet.trim());
        tradingWallets.add(wallet.trim());
      }
    });

    console.log(`   Found ${positions.length} unique wallets from positions`);

    // 3. Extract from Trades (user field)
    console.log('💰 Checking trade user addresses...');
    const traders = await tradeModel.distinct('user');
    
    traders.forEach(wallet => {
      if (wallet && wallet.trim()) {
        allWallets.add(wallet.trim());
        tradingWallets.add(wallet.trim());
      }
    });

    console.log(`   Found ${traders.length} unique wallets from trades`);

    // 4. Extract from Sponsorships (user_address field)
    console.log('🎁 Checking sponsored user addresses...');
    const sponsoredUsers = await sponsorshipModel.distinct('user_address');
    
    sponsoredUsers.forEach(wallet => {
      if (wallet && wallet.trim()) {
        allWallets.add(wallet.trim());
        sponsoredWallets.add(wallet.trim());
      }
    });

    console.log(`   Found ${sponsoredUsers.length} unique wallets from sponsorships`);

    // Convert Set to Array and sort
    const uniqueWallets = Array.from(allWallets).sort();

    // Create stats object
    const stats: WalletStats = {
      total_unique_wallets: uniqueWallets.length,
      waitlist_wallets: waitlistWallets.size,
      trading_wallets: tradingWallets.size,
      sponsored_wallets: sponsoredWallets.size,
      wallets: uniqueWallets
    };

    // Print summary
    console.log('\n📈 WALLET EXTRACTION SUMMARY');
    console.log('================================');
    console.log(`Total unique wallets: ${stats.total_unique_wallets}`);
    console.log(`Waitlist wallets: ${stats.waitlist_wallets}`);
    console.log(`Trading wallets: ${stats.trading_wallets}`);
    console.log(`Sponsored wallets: ${stats.sponsored_wallets}`);
    console.log('================================\n');

    // Print first 10 wallets as sample
    console.log('📋 Sample wallets (first 10):');
    uniqueWallets.slice(0, 10).forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet}`);
    });

    if (uniqueWallets.length > 10) {
      console.log(`... and ${uniqueWallets.length - 10} more\n`);
    }

    // Output full JSON
    console.log('📄 Full JSON output:');
    console.log(JSON.stringify(stats, null, 2));

    // Save to file (optional)
    const fs = require('fs');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `wallets-export-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(stats, null, 2));
    console.log(`\n💾 Saved to file: ${filename}`);

    return stats;

  } catch (error) {
    console.error('❌ Error extracting wallets:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the script
if (require.main === module) {
  extractAllWallets()
    .then(() => {
      console.log('✅ Wallet extraction completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { extractAllWallets };