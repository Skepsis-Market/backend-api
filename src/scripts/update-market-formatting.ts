import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketDocument } from '../modules/markets/schemas/market.schema';

/**
 * Script to add default value formatting fields to existing markets
 * Run with: npm run script:update-market-formatting
 */
async function updateMarketFormatting() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const marketModel = app.get<Model<MarketDocument>>('MarketModel');

    console.log('🔄 Updating existing markets with value formatting defaults...\n');

    // Find all markets that don't have valueType set
    const markets = await marketModel.find({
      'configuration.valueType': { $exists: false }
    });

    console.log(`Found ${markets.length} markets to update`);

    let updated = 0;
    for (const market of markets) {
      const minDisplay = market.configuration.minValue / Math.pow(10, market.configuration.decimalPrecision);
      const maxDisplay = market.configuration.maxValue / Math.pow(10, market.configuration.decimalPrecision);
      
      // Smart detection of useKSuffix based on value range
      const useKSuffix = (minDisplay >= 1000 || maxDisplay >= 1000);

      // Update the market
      await marketModel.updateOne(
        { _id: market._id },
        {
          $set: {
            'configuration.valueType': 'currency',
            'configuration.valuePrefix': '$',
            'configuration.valueSuffix': '',
            'configuration.useKSuffix': useKSuffix,
          }
        }
      );

      console.log(`✅ Updated market: ${market.configuration.marketName}`);
      console.log(`   Range: ${minDisplay} - ${maxDisplay}, useKSuffix: ${useKSuffix}`);
      updated++;
    }

    console.log(`\n✅ Updated ${updated} markets successfully!`);

    // Show summary
    const allMarkets = await marketModel.find({});
    console.log('\n📊 Market Formatting Summary:');
    for (const market of allMarkets) {
      console.log(`\n${market.configuration.marketName}:`);
      console.log(`  Type: ${market.configuration.valueType || 'N/A'}`);
      console.log(`  Prefix: "${market.configuration.valuePrefix || ''}"`);
      console.log(`  Suffix: "${market.configuration.valueSuffix || ''}"`);
      console.log(`  Use K Suffix: ${market.configuration.useKSuffix ?? 'N/A'}`);
      console.log(`  Range: ${market.configuration.minValue} - ${market.configuration.maxValue}`);
      console.log(`  Precision: ${market.configuration.decimalPrecision}`);
    }

    return { updated, total: allMarkets.length };

  } catch (error) {
    console.error('❌ Error updating markets:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the script
if (require.main === module) {
  updateMarketFormatting()
    .then((result) => {
      console.log(`\n✅ Migration completed! Updated ${result.updated}/${result.total} markets`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { updateMarketFormatting };
