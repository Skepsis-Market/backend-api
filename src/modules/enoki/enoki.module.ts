import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EnokiController } from './enoki.controller';
import { EnokiService } from './enoki.service';
import { Sponsorship, SponsorshipSchema } from './schemas/sponsorship.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Sponsorship.name, schema: SponsorshipSchema },
    ]),
  ],
  controllers: [EnokiController],
  providers: [EnokiService],
  exports: [EnokiService],
})
export class EnokiModule {}
