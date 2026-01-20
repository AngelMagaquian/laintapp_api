import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayConfigController } from './pay-config.controller';
import { PayConfigService } from './pay-config.service';
import { PaySimulationConfig, PaySimulationConfigSchema } from '../schemas/paySimulationConfig.schema';
import { DateRangeConfig, DateRangeConfigSchema } from '../schemas/dateRangeConfig.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PaySimulationConfig.name, schema: PaySimulationConfigSchema },
            { name: DateRangeConfig.name, schema: DateRangeConfigSchema }
        ]),
    ],
    controllers: [PayConfigController],
    providers: [PayConfigService],
})
export class PayConfigModule { }
