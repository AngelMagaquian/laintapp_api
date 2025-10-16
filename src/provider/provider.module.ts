import { Module } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { ProviderController } from './provider.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Provider, ProviderSchema } from '../schemas/provider.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Provider.name, schema: ProviderSchema }]),
    UsersModule,
  ],
  providers: [ProviderService],
  controllers: [ProviderController]
})
export class ProviderModule {}
