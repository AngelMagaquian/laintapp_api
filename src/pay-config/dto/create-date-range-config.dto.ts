import { Type } from 'class-transformer';
import { IsString, IsDate, IsNumber, IsBoolean, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';

export class DateRangeDetailDto {
    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsNumber()
    total: number;

    @IsBoolean()
    isWorkingDay: boolean;
}

export class CreateDateRangeConfigDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    endDate: Date;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DateRangeDetailDto)
    details: DateRangeDetailDto[];
}
