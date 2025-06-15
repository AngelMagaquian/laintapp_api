import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean, IsArray, MinLength, Matches, IsDateString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Nombre del usuario' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @ApiProperty({ description: 'Apellido del usuario' })
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  lastname: string;

  @ApiProperty({ description: 'Número de teléfono' })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'El número de teléfono debe ser válido' })
  phone: string;

  @ApiProperty({ description: 'Fecha de nacimiento' })
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida' })
  birthdate: Date;

  @ApiProperty({ description: 'Nombre de usuario único' })
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' })
  username: string;

  @ApiProperty({ description: 'Correo electrónico único' })
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  email: string;

  @ApiProperty({ description: 'Contraseña del usuario' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/,
    { message: 'La contraseña debe tener al menos una mayúscula, un número y un símbolo especial' }
  )
  pass: string;

  @ApiProperty({ description: 'ID del rol asignado', required: false })
  @IsOptional()
  @IsString({ message: 'El ID del rol debe ser una cadena de texto' })
  role?: string;

  @ApiProperty({ description: 'Indica si el usuario es estricto', default: false })
  @IsOptional()
  @IsBoolean({ message: 'isStrict debe ser un valor booleano' })
  isStrict?: boolean;

  @ApiProperty({ description: 'Indica si el usuario está activo', default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive?: boolean;

  @ApiProperty({ description: 'Lista de permisos', required: false, type: [Object] })
  @IsOptional()
  @IsArray({ message: 'Los permisos deben ser un array' })
  permissions?: any[];
} 