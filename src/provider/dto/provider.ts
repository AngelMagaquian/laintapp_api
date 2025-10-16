import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CardTypeDto {
  @ApiProperty({ description: 'Nombre del tipo de tarjeta' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tiempo de nómina' })
  @IsNumber()
  payroll_time: number;

  @ApiProperty({ description: 'Interés de nómina' })
  @IsNumber()
  payroll_interest: number;

  @ApiProperty({ description: 'Comisión de nómina' })
  @IsNumber()
  payroll_commission: number;
}

export class CreateProviderDto {
  @ApiProperty({ description: 'Nombre del proveedor' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipos de tarjeta', type: [CardTypeDto] })
  @IsArray()
  card_type: CardTypeDto[];
}

export class UpdateProviderDto {
  @ApiProperty({ description: 'Nombre del proveedor', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Tipos de tarjeta', type: [CardTypeDto], required: false })
  @IsOptional()
  @IsArray()
  card_type?: CardTypeDto[];
}

export class AddCardTypeDto {
  @ApiProperty({ description: 'ID del proveedor' })
  @IsString()
  providerId: string;

  @ApiProperty({ description: 'Nuevo tipo de tarjeta' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tiempo de nómina' })
  @IsNumber()
  payroll_time: number;

  @ApiProperty({ description: 'Interés de nómina' })
  @IsNumber()
  payroll_interest: number;

  @ApiProperty({ description: 'Comisión de nómina' })
  @IsNumber()
  payroll_commission: number;
}