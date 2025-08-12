import { Module } from '@nestjs/common';
import { NotMatchingController } from './not-matching.controller';
import { NotMatchingService } from './not-matching.service';
import { MongooseModule } from '@nestjs/mongoose';
import { NotMatching, NotMatchingSchema } from '../schemas/notMatching.schema';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NotMatching.name, schema: NotMatchingSchema }]),
    UsersModule,
    PermissionsModule,
    RolesModule
  ],
  controllers: [NotMatchingController],
  providers: [NotMatchingService]
})
export class NotMatchingModule {}
