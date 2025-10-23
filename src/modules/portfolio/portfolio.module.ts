import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { SuiPriceService } from './sui-price.service';
import { Trade, TradeSchema } from './schemas/trade.schema';
import { Position, PositionSchema } from './schemas/position.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trade.name, schema: TradeSchema },
      { name: Position.name, schema: PositionSchema },
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService, SuiPriceService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
