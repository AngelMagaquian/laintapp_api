import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose';

export enum PermissionAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

@Schema({ timestamps: true })
export class Permission extends Document {
  @Prop({ required: true })
  module: string;

  @Prop({ 
    required: true, 
    enum: Object.values(PermissionAction),
    type: String 
  })
  action: PermissionAction;

  @Prop({ default: '' })
  description: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);