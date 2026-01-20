import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class CreatePayConfigDto {
    @IsNumber()
    @IsNotEmpty()
    accreditation_time: number;

    @IsNumber()
    @IsNotEmpty()
    tariff: number;

    @IsNumber()
    @IsNotEmpty()
    IVA_tariff: number;

    @IsNumber()
    @IsNotEmpty()
    tax_debt_credit: number;

    @IsNumber()
    @IsNotEmpty()
    financial_discounts: number;

    @IsNumber()
    @IsNotEmpty()
    IVA_financial_discounts: number;

    @IsNumber()
    @IsNotEmpty()
    SIRTAC: number;

    @IsString()
    @IsNotEmpty()
    config_name: string;
}
