import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaxesDeductionDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    provider: string;

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    costo_servicio?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    iva?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    iibb?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    descuentos_financieros?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    imp_credito_debito?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    per_iva?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    otros_imp?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    otros_aran?: number;

    @ApiProperty()
    @IsNumber()
    @IsOptional()
    count?: number;
}
