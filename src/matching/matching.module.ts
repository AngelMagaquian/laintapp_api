import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { Matching, MatchingSchema } from '../schemas/matching.schema';
import { TaxesDeductions, TaxesDeductionsSchema } from '../schemas/taxes_deductions.schema';
// NotMatching schema removed from this module; handled in NotMatchingModule
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Matching.name, schema: MatchingSchema },
      { name: TaxesDeductions.name, schema: TaxesDeductionsSchema }
    ]),
    UsersModule
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService]
})
export class MatchingModule { }
