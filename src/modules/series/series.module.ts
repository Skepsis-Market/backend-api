import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { MarketSeries, MarketSeriesSchema } from './schemas/market-series.schema';
import { Market, MarketSchema } from '../markets/schemas/market.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketSeries.name, schema: MarketSeriesSchema },
      { name: Market.name, schema: MarketSchema },
    ]),
  ],
  controllers: [SeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
