import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from '../schemas/user.schema';
/* import { Role, RoleSchema } from '../schemas/role.schema'; */
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../logger/logger.module';
import { MailModule } from '../mail/mail.module';
/* MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]), */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => LoggerModule),
    forwardRef(() => AuthModule),
    MailModule
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}