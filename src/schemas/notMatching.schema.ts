import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class NotMatching extends Document {
  @Prop({ 
    type: Object, 
    required: true,
    additionalProperties: true
  })
  original_data: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: String, required: true })
  provider_name: string;

  @Prop({ type: Date, required: false })
  file_date: Date;

  @Prop({ type: String, required: false })
  transaction_type: string;
}

export const NotMatchingSchema = SchemaFactory.createForClass(NotMatching);