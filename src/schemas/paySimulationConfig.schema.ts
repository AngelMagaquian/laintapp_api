import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose';


@Schema({ timestamps: true })
export class PaySimulationConfig extends Document {


    @Prop({
        required: true,
    })
    accreditation_time: number;

    @Prop({ required: true })
    tariff: number;

    @Prop({ required: true })
    IVA_tariff: number;

    @Prop({ required: true })
    tax_debt_credit: number;

    @Prop({ required: true })
    financial_discounts: number;

    @Prop({ required: true })
    IVA_financial_discounts: number;

    @Prop({ required: true })
    SIRTAC: number;

    @Prop({ required: true })
    config_name: string;
}

export const PaySimulationConfigSchema = SchemaFactory.createForClass(PaySimulationConfig);