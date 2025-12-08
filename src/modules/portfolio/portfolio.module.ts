import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { 
  PortfolioController, 
  UsersPositionController, 
  MarketsPositionController,
  LeaderboardController 
} from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { SuiPriceService } from './sui-price.service';
import { UserPositionService } from './services/user-position.service';
import { PositionEventService } from './services/position-event.service';
import { LeaderboardService } from './services/leaderboard.service';
import { Trade, TradeSchema } from './schemas/trade.schema';
import { Position, PositionSchema } from './schemas/position.schema';
import { UserPosition, UserPositionSchema } from './schemas/user-position.schema';
import { PositionEvent, PositionEventSchema } from './schemas/position-event.schema';
import { MarketCache, MarketCacheSchema } from './schemas/market-cache.schema';
import { Market, MarketSchema } from '../markets/schemas/market.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trade.name, schema: TradeSchema },
      { name: Position.name, schema: PositionSchema },
      { name: UserPosition.name, schema: UserPositionSchema },
      { name: PositionEvent.name, schema: PositionEventSchema },
      { name: MarketCache.name, schema: MarketCacheSchema },
      { name: Market.name, schema: MarketSchema },
    ]),
  ],
  controllers: [
    PortfolioController,
    UsersPositionController,
    MarketsPositionController,
    LeaderboardController,
  ],
  providers: [
    PortfolioService, 
    SuiPriceService,
    UserPositionService,
    PositionEventService,
    LeaderboardService,
  ],
  exports: [
    PortfolioService,
    UserPositionService,
    PositionEventService,
    LeaderboardService,
  ],
})
export class PortfolioModule {}
