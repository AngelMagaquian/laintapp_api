import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemovePermissionDto {
  @ApiProperty({
    description: 'ID del permiso a eliminar',
    example: '6834f1364b90d6f8a69ae9b6'
  })
  @IsNotEmpty()
  @IsString()
  _id: string;
} 