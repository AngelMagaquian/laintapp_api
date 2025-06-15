import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose';


@Schema({ timestamps: true })
export class Logger extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ 
    required: true, 
    enum: ["success", "error", "info", "warning"],
    type: String 
  })
  status: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
  exp_date: Date;
}

export const LoggerSchema = SchemaFactory.createForClass(Logger);