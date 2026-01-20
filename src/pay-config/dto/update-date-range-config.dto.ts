import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { DateRangeDetailDto } from './create-date-range-config.dto';

export class UpdateDateRangeConfigDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DateRangeDetailDto)
    details: DateRangeDetailDto[];
}
