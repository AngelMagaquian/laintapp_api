import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class DateRangeDetail {
    @Prop({ required: true })
    date: Date;

    @Prop({ required: true })
    total: number;

    @Prop({ required: true })
    isWorkingDay: boolean;
}

@Schema({ timestamps: true })
export class DateRangeConfig extends Document {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ type: [DateRangeDetail], required: true })
    details: DateRangeDetail[];
}

export const DateRangeConfigSchema = SchemaFactory.createForClass(DateRangeConfig);
