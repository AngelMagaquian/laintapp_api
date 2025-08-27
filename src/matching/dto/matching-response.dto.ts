import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsDate, IsEnum, IsObject } from 'class-validator';
import { MatchResult } from './matching-file';
import { MatchLevel, MatchStatus } from '../../schemas/matching.schema';

export class FormattedMatchingDto {
  @ApiProperty({ 
    description: 'Nombre del proveedor',
    type: String
  })
  @IsString()
  provider: string;

  @ApiProperty({ 
    description: 'ID de la transacción',
    type: String,
    nullable: true
  })
  @IsOptional()
  @IsString()
  transaction_id: string | null;

  @ApiProperty({ 
    description: 'Tipo de transacción',
    type: String
  })
  @IsString()
  transaction_type: string;

  @ApiProperty({ 
    description: 'Fecha del archivo',
    type: Date
  })
  @IsDate()
  file_date: Date;

  @ApiProperty({ 
    description: 'Monto de la transacción',
    type: Number
  })
  @IsOptional()
  amount: number;

  @ApiProperty({ 
    description: 'Tipo de tarjeta',
    type: String
  })
  @IsOptional()
  card_type: string;

  @ApiProperty({ 
    description: 'Cupón',
    type: String
  })
  @IsOptional()
  cupon: any;

  @ApiProperty({ 
    description: 'Lote',
    type: String
  })
  @IsOptional()
  lote: any;

  @ApiProperty({ 
    description: 'TPV',
    type: String
  })
  @IsOptional()
  tpv: any;

  @ApiProperty({ 
    description: 'Estado del matching',
    enum: MatchStatus
  })
  @IsEnum(MatchStatus)
  status: MatchStatus;

  @ApiProperty({ 
    description: 'Usuario que revisó',
    type: Object,
    required: false
  })
  @IsOptional()
  @IsObject()
  reviewedBy: any;

  @ApiProperty({ 
    description: 'Información de la sucursal',
    type: String
  })
  @IsString()
  sucursal: string|null;

  @ApiProperty({ 
    description: 'Campos que coincidieron',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  matchedFields: string[];

  @ApiProperty({ 
    description: 'Nivel de coincidencia',
    enum: MatchLevel
  })
  @IsEnum(MatchLevel)
  matchLevel: MatchLevel;
}

export class MatchingResponseDto {
  @ApiProperty({ 
    description: 'Resultados del proceso de matching',
    type: [MatchResult]
  })
  @IsArray()
  matchingValues: MatchResult[];

  @ApiProperty({ 
    description: 'Proveedores que no tuvieron match',
    type: [Object],
    additionalProperties: true
  })
  @IsArray()
  notMatching: any[];
} 