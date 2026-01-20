import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorLoggerInterceptor } from './common/interceptors/error-logger.interceptor';
import { LoggerModule } from './logger/logger.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { MatchingModule } from './matching/matching.module';
import { NotMatchingModule } from './not-matching/not-matching.module';
import { ProviderModule } from './provider/provider.module';
import { PayConfigModule } from './pay-config/pay-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    LoggerModule,
    UsersModule,
    AuthModule,
    CoreModule,
    PermissionsModule,
    RolesModule,
    MatchingModule,
    NotMatchingModule,
    NotMatchingModule,
    ProviderModule,
    PayConfigModule
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggerInterceptor,
    },
  ],
})
export class AppModule { }
