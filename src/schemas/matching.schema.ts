import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MatchLevel {
  GREEN = 'green',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red'
}

export enum MatchStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MANUAL = 'manual'
}

@Schema({ timestamps: true })
export class Matching extends Document {
  @Prop({ 
    type: Object, 
    required: true,
    additionalProperties: true
  })
  xrp: Record<string, any>;

  @Prop({ 
    type: Object, 
    required: false,
    additionalProperties: true,
    default: null
  })
  provider: Record<string, any> | null;

  @Prop({ 
    required: true,
    enum: Object.values(MatchLevel),
    type: String,
    default: MatchLevel.RED
  })
  matchLevel: MatchLevel;

  @Prop({ 
    type: [String],
    required: true,
    default: []
  })
  matchedFields: string[];

  @Prop({ 
    required: true,
    enum: Object.values(MatchStatus),
    type: String,
    default: MatchStatus.PENDING
  })
  status: MatchStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: String, required: true })
  provider_name: string;

  @Prop({ type: String, required: true })
  transaction_id: string;

  @Prop({ type: Date, required: false })
  file_date: Date;

  @Prop({ type: String, required: true, enum: ['credit', 'debit'] })
  transaction_type: 'credit' | 'debit';
}

export const MatchingSchema = SchemaFactory.createForClass(Matching);