import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private loggerService: LoggerService
  ) {}

  async findAll() {
    try {
      return await this.roleModel.find().populate({
        path: 'permissions',
        model: 'Permission',
        select: 'module action'
      }).exec();
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener los roles');
    }
  }

  async createRole(createRoleDto: CreateRoleDto, creatorId: string) {
    try {
      console.log('Iniciando creación de rol con datos:', createRoleDto);
      const { name, description, permissions = [] } = createRoleDto;

      // Validar que los IDs de permisos sean válidos
      const validPermissions = permissions.map(permissionId => {
        try {
          return new Types.ObjectId(permissionId);
        } catch (error) {
          console.error(`ID de permiso inválido: ${permissionId}`);
          throw new InternalServerErrorException(`ID de permiso inválido: ${permissionId}`);
        }
      });

      console.log('Permisos validados:', validPermissions);

      // Crear el nuevo rol
      const role = new this.roleModel({
        name,
        description,
        permissions: validPermissions
      });

      console.log('Rol a guardar:', JSON.stringify(role, null, 2));

      const savedRole = await role.save();
      console.log('Rol guardado exitosamente:', savedRole);

      // Crear log de la acción
      const logDescription = `Se creó el rol ${name} con ${permissions.length} permisos`;
      await this.loggerService.createLog(creatorId, 'success', logDescription);

      return savedRole;
    } catch (error) {
      console.error('Error detallado al crear rol:', error);
      // Crear log del error
      await this.loggerService.createLog(
        creatorId,
        'error',
        `Error al crear rol ${createRoleDto.name}: ${error.message}`
      );
      throw new InternalServerErrorException(`Error al crear el rol: ${error.message}`);
    }
  }

  async findOne(identifier: string) {
    try {
      // Verificar si el identifier es un ObjectId válido
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
      
      const query = isObjectId 
        ? { _id: identifier }
        : { identifier };

      return await this.roleModel.findOne(query).populate({
        path: 'permissions',
        model: 'Permission',
      }).exec();
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener el rol');
    }
  }

  async updateRole(updateRoleDto: any) {
    try {
      const { _id, name, description, permissions = [] } = updateRoleDto;
      console.log('Datos recibidos en el servicio:', updateRoleDto);

      // Validar que el _id sea un ObjectId válido
      if (!Types.ObjectId.isValid(_id)) {
        throw new BadRequestException('ID de rol inválido');
      }

      const roleId = Types.ObjectId.createFromHexString(_id);

      // Actualizar el rol
      const role = await this.roleModel.findOneAndUpdate(
        { _id: roleId },
        { name, description, permissions },
        { new: true }
      ).populate({
        path: 'permissions',
        model: 'Permission',
      }).exec();

      if (!role) {
        throw new NotFoundException('Rol no encontrado');
      }

      // Buscar usuarios con este rol y isStrict: true
      const userModel = this.roleModel.db.model('User');
      const users = await userModel.find({
        role: roleId,
        isStrict: true
      });

      // Actualizar permisos de cada usuario
      for (const user of users) {
        const userPermissions = role.permissions.map(permission => ({
          permission: permission._id,
          temporal: { status: false, exp_date: null },
          createdDate: new Date()
        }));

        await userModel.findByIdAndUpdate(
          user._id,
          { $set: { permissions: userPermissions } }
        );
      }

      return {
        role,
        updatedUsers: users.length
      };
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar el rol');
    }
  }
} 