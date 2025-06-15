import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsDateString, Matches, IsNotEmpty } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Nombre del usuario', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Apellido del usuario', required: false })
  @IsString()
  @IsOptional()
  lastname?: string;

  @ApiProperty({ description: 'Número de teléfono', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'El número de teléfono debe ser válido' })
  phone?: string;

  @ApiProperty({ description: 'Fecha de nacimiento', required: false })
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida' })
  @IsOptional()
  birthdate?: Date;

  @ApiProperty({ description: 'Nombre de usuario', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'Correo electrónico', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Contraseña', required: false })
  @IsString()
  @IsOptional()
  pass?: string;
} 


export class ChangePasswordDto {
  @ApiProperty({ description: 'ID del usuario', required: true })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Contraseña actual', required: true })
  @IsString()
  @IsNotEmpty()
  currentPass: string;

  @ApiProperty({ description: 'Nueva contraseña', required: true })
  @IsString()
  @IsNotEmpty()
  newPass: string;
}