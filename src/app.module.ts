import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { MarketsModule } from './modules/markets/markets.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // MongoDB connection
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/skepsis'),
    
    // Feature modules
    WaitlistModule,
    PortfolioModule,
    MarketsModule,
  ],
})
export class AppModule {}
