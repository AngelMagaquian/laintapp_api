import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, IsArray, IsEnum, IsNumber, IsOptional, IsDate } from 'class-validator';
import { Types } from 'mongoose';

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

export class MatchResult {
  @ApiProperty({ 
    description: 'ID único del resultado de matching',
    type: Number
  })
  @IsNumber()
  id: number;

  @ApiProperty({ 
    description: 'Datos completos del archivo XRP',
    type: 'object',
    additionalProperties: true
  })
  @IsObject()
  xrp: Record<string, any>;

  @ApiProperty({ 
    description: 'Datos del proveedor que coincide, o null si no hay match',
    type: 'object',
    nullable: true,
    additionalProperties: true
  })
  @IsObject()
  provider: Record<string, any> | null;

  @ApiProperty({ 
    description: 'Nivel de coincidencia entre los registros',
    enum: MatchLevel
  })
  @IsEnum(MatchLevel)
  matchLevel: MatchLevel;

  @ApiProperty({ 
    description: 'Lista de campos que coincidieron entre los registros',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  matchedFields: string[];

  @ApiProperty({ 
    description: 'Estado del resultado de matching',
    enum: MatchStatus,
    default: MatchStatus.PENDING
  })
  @IsEnum(MatchStatus)
  status: MatchStatus;

  @ApiProperty({ 
    description: 'ID del usuario que revisó la coincidencia',
    type: String,
    required: false
  })
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @ApiProperty({ 
    description: 'Fecha de la coincidencia',
    type: Date,
    required: false
  })
  @IsOptional()
  @IsDate()
  file_date?: Date;

  @IsString()
  transaction_type: string;
}