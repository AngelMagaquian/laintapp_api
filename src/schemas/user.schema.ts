import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Habilita createdAt y updatedAt
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  lastname: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  birthdate: Date;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  pass: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', default: null })
  role?: Types.ObjectId;

  @Prop({ default: false })
  isStrict: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ 
    type: [{ 
      permission: { type: Types.ObjectId, ref: 'Permission' }, 
      temporal: { 
        status: { type: Boolean, default: false }, 
        exp_date: { type: Date, default: null } 
      }, 
      createdDate: { type: Date, default: Date.now } 
    }], 
    default: [] 
  })
  permissions: { 
    permission: Types.ObjectId | string, 
    temporal: { status: boolean, exp_date: Date | null }, 
    createdDate: Date 
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User);