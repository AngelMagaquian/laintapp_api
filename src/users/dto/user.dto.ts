import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { User } from '../../schemas/user.schema';

export class UserDto extends User {
  @ApiProperty({ description: 'ID único del usuario' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Nombre del usuario' })
  name: string;

  @ApiProperty({ description: 'Apellido del usuario' })
  lastname: string;

  @ApiProperty({ description: 'Número de teléfono del usuario' })
  phone: string;

  @ApiProperty({ description: 'Fecha de nacimiento del usuario' })
  birthdate: Date;

  @ApiProperty({ description: 'Nombre de usuario único' })
  username: string;

  @ApiProperty({ description: 'Correo electrónico único' })
  email: string;

  @ApiProperty({ description: 'ID del rol asignado', required: false })
  role?: Types.ObjectId;

  @ApiProperty({ description: 'Indica si el usuario tiene permisos estrictos', default: false })
  isStrict: boolean;

  @ApiProperty({ description: 'Indica si el usuario está activo', default: true })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Lista de permisos del usuario',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        permission: { type: 'string', format: 'ObjectId' },
        temporal: {
          type: 'object',
          properties: {
            status: { type: 'boolean' },
            exp_date: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        createdDate: { type: 'string', format: 'date-time' }
      }
    }
  })
  permissions: {
    permission: Types.ObjectId;
    temporal: { status: boolean; exp_date: Date | null };
    createdDate: Date;
  }[];

  @ApiProperty({ description: 'Fecha de creación del usuario' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización del usuario' })
  updatedAt: Date;
} 