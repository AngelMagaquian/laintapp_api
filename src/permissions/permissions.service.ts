import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Permission } from '../schemas/permission.schema';
import { User } from '../schemas/user.schema';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    @InjectModel(User.name) private userModel: Model<User>,
    private loggerService: LoggerService
  ) {}

  async findAll() {
    try {
      return await this.permissionModel.find().exec();
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener los permisos');
    }
  }

  async createPermission(createPermissionDto: CreatePermissionDto, creatorId: string) {
    try {
      const { module, action, addToSuperadmin = false } = createPermissionDto;

      // Crear el nuevo permiso
      const permission = new this.permissionModel({
        module,
        action
      });
      const savedPermission = await permission.save();

      // Si se especifica, agregar el permiso al superadmin
      if (addToSuperadmin) {
        const superadmin = await this.userModel.findOne({ role: 'superadmin' });
        if (superadmin) {
          superadmin.permissions.push({
            permission: savedPermission._id as Types.ObjectId,
            temporal: {
              status: false,
              exp_date: null
            },
            createdDate: new Date()
          });
          await superadmin.save();
        }
      }

      // Crear log de la acción
      const description = `Se creó el permiso ${module}:${action}${addToSuperadmin ? ' y se agregó al superadmin' : ''}`;
      await this.loggerService.createLog(creatorId, 'success', description);

      return savedPermission;
    } catch (error) {
      // Crear log del error
      await this.loggerService.createLog(
        creatorId,
        'error',
        `Error al crear permiso ${createPermissionDto.module}:${createPermissionDto.action}: ${error.message}`
      );
      throw new InternalServerErrorException('Error al crear el permiso');
    }
  }
}
