import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Módulo al que pertenece el permiso' })
  @IsString({ message: 'El módulo debe ser una cadena de texto' })
  module: string;

  @ApiProperty({ description: 'Acción que permite realizar el permiso' })
  @IsString({ message: 'La acción debe ser una cadena de texto' })
  action: string;

  @ApiProperty({ description: 'Indica si el permiso se agrega al superadmin', default: false })
  @IsOptional()
  @IsBoolean({ message: 'addToSuperadmin debe ser un valor booleano' })
  addToSuperadmin?: boolean;
} 