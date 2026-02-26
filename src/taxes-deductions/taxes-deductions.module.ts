import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaxesDeductionsController } from './taxes-deductions.controller';
import { TaxesDeductionsService } from './taxes-deductions.service';
import { TaxesDeductions, TaxesDeductionsSchema } from '../schemas/taxes_deductions.schema';
import { UsersModule } from '../users/users.module'; // Importante para PermissionsGuard si usa UserService

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TaxesDeductions.name, schema: TaxesDeductionsSchema }
        ]),
        UsersModule
    ],
    controllers: [TaxesDeductionsController],
    providers: [TaxesDeductionsService],
    exports: [TaxesDeductionsService]
})
export class TaxesDeductionsModule { }
