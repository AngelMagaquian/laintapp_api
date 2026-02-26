import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TaxesDeductions extends Document {
    @Prop({ type: String, required: true })
    provider: string;

    @Prop({ type: Date, required: true })
    date: Date;

    @Prop({ type: Number, required: true, default: 0 })
    costo_servicio: number;

    @Prop({ type: Number, required: true, default: 0 })
    iva: number;

    @Prop({ type: Number, required: true, default: 0 })
    iibb: number;

    @Prop({ type: Number, required: true, default: 0 })
    descuentos_financieros: number;

    @Prop({ type: Number, required: true, default: 0 })
    imp_credito_debito: number;

    @Prop({ type: Number, required: true, default: 0 })
    per_iva: number;

    @Prop({ type: Number, required: true, default: 0 })
    otros_imp: number;

    @Prop({ type: Number, required: true, default: 0 })
    otros_aran: number;

    @Prop({ type: Number, required: true, default: 0 })
    count: number;
}

export const TaxesDeductionsSchema = SchemaFactory.createForClass(TaxesDeductions);
