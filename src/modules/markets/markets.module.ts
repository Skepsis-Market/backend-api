import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { Market, MarketSchema } from './schemas/market.schema';
import { S3UploadService } from '../../common/services/s3-upload.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Market.name, schema: MarketSchema },
    ]),
  ],
  controllers: [MarketsController],
  providers: [MarketsService, S3UploadService],
  exports: [MarketsService],
})
export class MarketsModule {}
