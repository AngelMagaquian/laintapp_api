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
  MANUAL = 'manual',
  SETTLED = 'settled'
}

@Schema({ timestamps: true })
export class Matching extends Document {
  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: false, default: null })
  transaction_id: string | null;

  @Prop({ type: String, required: true })
  transaction_type: string;

  @Prop({ type: Date, required: true })
  file_date: Date;

  @Prop({ type: Number, required: false })
  amount: number;

  @Prop({ type: String, required: false })
  card_type: string;

  @Prop({ type: String, required: false })
  cupon: string;

  @Prop({ type: String, required: false })
  lote: string;

  @Prop({ type: String, required: false })
  tpv: string;

  @Prop({
    required: true,
    enum: Object.values(MatchStatus),
    type: String,
    default: MatchStatus.PENDING
  })
  status: MatchStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop({
    type: String,
    required: false,
    default: null
  })
  sucursal: string | null;

  @Prop({
    type: [String],
    required: true,
    default: []
  })
  matchedFields: string[];

  @Prop({
    required: true,
    enum: Object.values(MatchLevel),
    type: String,
    default: MatchLevel.RED
  })
  matchLevel: MatchLevel;

  @Prop({ type: Number, required: false, default: 0 })
  estimated_net: number;

  @Prop({ type: Date, required: false, default: null })
  estimated_payrollDate: Date;

  @Prop({ type: Number, required: false, default: 0 })
  amount_net: number;

  @Prop({ type: Date, required: false, default: null })
  payrollDate: Date;
}

export const MatchingSchema = SchemaFactory.createForClass(Matching);