import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { Matching, MatchingSchema } from '../schemas/matching.schema';
import { NotMatching, NotMatchingSchema } from '../schemas/notMatching.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Matching.name, schema: MatchingSchema },
      { name: NotMatching.name, schema: NotMatchingSchema }
    ]),
    UsersModule
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService]
})
export class MatchingModule {}
