import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketDocument } from '../modules/markets/schemas/market.schema';

/**
 * Script to add images to existing BTC and SUI markets
 * Run with: npm run script:add-market-images
 */
async function addMarketImages() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const marketModel = app.get<Model<MarketDocument>>('MarketModel');

    console.log('🖼️  Adding images to markets...\n');

    // Image URLs
    const btcImageUrl = 'https://skepsis-markets-testnet.s3.us-east-1.amazonaws.com/markets/bb2a2168-3ad9-438d-8aac-7a0e2ff8f6ef.png';
    const btcImageKey = 'markets/bb2a2168-3ad9-438d-8aac-7a0e2ff8f6ef.png';
    
    const suiImageUrl = 'https://skepsis-markets-testnet.s3.us-east-1.amazonaws.com/markets/3f100f05-220e-41ba-aa7b-19bb35eea55a.png';
    const suiImageKey = 'markets/3f100f05-220e-41ba-aa7b-19bb35eea55a.png';

    // Find all BTC markets
    const btcMarkets = await marketModel.find({
      'configuration.marketName': { $regex: /bitcoin/i }
    });

    console.log(`Found ${btcMarkets.length} Bitcoin markets`);

    // Update BTC markets
    let btcUpdated = 0;
    for (const market of btcMarkets) {
      await marketModel.updateOne(
        { _id: market._id },
        {
          $set: {
            'configuration.marketImage': btcImageUrl,
            'configuration.marketImageKey': btcImageKey,
          }
        }
      );
      console.log(`✅ Updated: ${market.configuration.marketName}`);
      btcUpdated++;
    }

    // Find all SUI markets
    const suiMarkets = await marketModel.find({
      'configuration.marketName': { $regex: /sui/i }
    });

    console.log(`\nFound ${suiMarkets.length} SUI markets`);

    // Update SUI markets
    let suiUpdated = 0;
    for (const market of suiMarkets) {
      await marketModel.updateOne(
        { _id: market._id },
        {
          $set: {
            'configuration.marketImage': suiImageUrl,
            'configuration.marketImageKey': suiImageKey,
          }
        }
      );
      console.log(`✅ Updated: ${market.configuration.marketName}`);
      suiUpdated++;
    }

    console.log(`\n✅ Successfully updated ${btcUpdated} BTC markets and ${suiUpdated} SUI markets!`);

    // Show summary
    console.log('\n📊 Market Images Summary:');
    const allMarkets = await marketModel.find({});
    for (const market of allMarkets) {
      const hasImage = market.configuration.marketImage ? '✅' : '❌';
      console.log(`${hasImage} ${market.configuration.marketName}`);
      if (market.configuration.marketImage) {
        console.log(`   Image: ${market.configuration.marketImage}`);
      }
    }

    return { btcUpdated, suiUpdated };

  } catch (error) {
    console.error('❌ Error adding images:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the script
if (require.main === module) {
  addMarketImages()
    .then((result) => {
      console.log(`\n✅ Migration completed! Updated ${result.btcUpdated} BTC and ${result.suiUpdated} SUI markets`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { addMarketImages };
