import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Provider extends Document {
  @Prop({ 
    required: true, 
    type: String 
  })
  name: string;

  @Prop({ 
    required: true, 
    type: [{
      name: { type: String, required: true },
      payroll_time: { type: Number, required: true },
      payroll_interest: { type: Number, required: true },
      payroll_commission: { type: Number, required: true }
    }]
  })
  card_type: {
    name: string;
    payroll_time: number;
    payroll_interest: number;
    payroll_commission: number;
  }[];
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);