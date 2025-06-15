import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLogsDto {
  @ApiProperty({ description: 'Número de página', required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number;

  @ApiProperty({ description: 'Límite de registros por página', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({ description: 'Término de búsqueda', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Estado del log', required: false, enum: ['success', 'error', 'info', 'warning'] })
  @IsOptional()
  @IsEnum(['success', 'error', 'info', 'warning'])
  status?: 'success' | 'error' | 'info' | 'warning';

  @ApiProperty({ description: 'Fecha inicial', required: false, type: Date })
  @IsOptional()
  @IsDateString()
  fromDate?: Date;

  @ApiProperty({ description: 'Fecha final', required: false, type: Date })
  @IsOptional()
  @IsDateString()
  toDate?: Date;
} 