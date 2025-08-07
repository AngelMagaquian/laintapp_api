import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../schemas/user.schema';
import { Permission } from '../schemas/permission.schema';
import { Role } from '../schemas/role.schema';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoreService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // Primero creamos los permisos y el rol
      await this.initializeBasicPermissions();
      const superAdminRole = await this.initializeSuperAdminRole();
      // Luego creamos el superadmin con la referencia al rol
      await this.initializeSuperAdmin(superAdminRole._id);
      console.log('Sistema inicializado correctamente');
    } catch (error) {
      console.error('Error durante la inicialización del sistema:', error);
      throw error;
    }
  }

  private async initializeSuperAdmin(roleId: Types.ObjectId) {
    const superAdminExists = await this.userModel.findOne({ role: roleId });
    if (!superAdminExists) {
      const hashedPassword = await bcrypt.hash(
        this.configService.get<string>('SUPER_ADMIN_PASSWORD'),
        10
      );

      // Obtener todos los permisos del rol superadmin
      const superAdminRole = await this.roleModel.findById(roleId).populate('permissions');
      const rolePermissions = superAdminRole.permissions.map(permission => ({
        permission: permission,
        temporal: {
          status: false, // No es temporal para el superadmin
          exp_date: null
        },
        createdDate: new Date()
      }));

      await this.userModel.create({
        username: this.configService.get<string>('SUPER_ADMIN_USERNAME'),
        email: this.configService.get<string>('SUPER_ADMIN_EMAIL'),
        pass: hashedPassword,
        name: this.configService.get<string>('SUPER_ADMIN_NAME'),
        lastname: this.configService.get<string>('SUPER_ADMIN_LASTNAME'),
        phone: this.configService.get<string>('SUPER_ADMIN_PHONE'),
        birthdate: new Date(this.configService.get<string>('SUPER_ADMIN_BIRTHDATE')),
        role: roleId,
        isActive: true,
        isStrict: true,
        permissions: rolePermissions
      });
      console.log('SuperAdmin creado exitosamente con todos los permisos del rol');
    }
  }

  private async initializeBasicPermissions() {
    const basicPermissions = [
      { module: 'users', action: 'create', description: 'Crear usuarios' },
      { module: 'users', action: 'read', description: 'Ver usuarios' },
      { module: 'users', action: 'update', description: 'Actualizar usuarios' },
      { module: 'users', action: 'delete', description: 'Eliminar usuarios' },
      { module: 'roles', action: 'create', description: 'Crear roles' },
      { module: 'roles', action: 'read', description: 'Ver roles' },
      { module: 'roles', action: 'update', description: 'Actualizar roles' },
      { module: 'roles', action: 'delete', description: 'Eliminar roles' },
      { module: 'permissions', action: 'create', description: 'Crear permisos' },
      { module: 'permissions', action: 'read', description: 'Ver permisos' },
      { module: 'permissions', action: 'update', description: 'Actualizar permisos' },
      { module: 'permissions', action: 'delete', description: 'Eliminar permisos' },
      { module: 'profile', action: 'update', description: 'Actualizar perfil' },
      { module: 'profile', action: 'read', description: 'Ver perfil' },
      { module: 'logs', action: 'read', description: 'Ver logs del sistema' },
      {module: 'profile-activity', action: 'read', description: 'Ver actividad del perfil'},
      {module: 'matching', action: 'read', description: 'Ver matching'},
      {module: 'matching', action: 'create', description: 'Crear matching'},
      {module: 'matching', action: 'update', description: 'Actualizar matching'},
      {module: 'matching', action: 'delete', description: 'Eliminar matching'}
    ];

    // Actualizar o crear permisos
    for (const perm of basicPermissions) {
      const exists = await this.permissionModel.findOne({
        module: perm.module,
        action: perm.action,
      });
      if (exists) {
        // Actualizar el permiso existente
        await this.permissionModel.findByIdAndUpdate(exists._id, perm);
      } else {
        // Crear nuevo permiso
        await this.permissionModel.create(perm);
      }
    }

    // Obtener el rol superadmin
    const superAdminRole = await this.roleModel.findOne({ name: 'superadmin' });
    if (superAdminRole) {
      // Obtener todos los permisos actuales
      const allPermissions = await this.permissionModel.find();
      const currentPermissionIds = superAdminRole.permissions.map(p => p.toString());
      
      // Filtrar los permisos que el superadmin no tiene
      const newPermissions = allPermissions.filter(p => !currentPermissionIds.includes(p._id.toString()));
      
      if (newPermissions.length > 0) {
        // Añadir nuevos permisos al rol superadmin
        await this.roleModel.findByIdAndUpdate(
          superAdminRole._id,
          { $push: { permissions: { $each: newPermissions.map(p => p._id) } } }
        );

        // Añadir nuevos permisos al usuario superadmin
        const superAdminUser = await this.userModel.findOne({ role: superAdminRole._id });
        if (superAdminUser) {
          const newUserPermissions = newPermissions.map(permission => ({
            permission: permission._id,
            temporal: {
              status: false,
              exp_date: null
            },
            createdDate: new Date()
          }));

          await this.userModel.findByIdAndUpdate(
            superAdminUser._id,
            { $push: { permissions: { $each: newUserPermissions } } }
          );
          
          console.log(`Se añadieron ${newPermissions.length} nuevos permisos al superadmin`);
        }
      }
    }

    console.log('Permisos básicos inicializados');
  }

  private async initializeSuperAdminRole(): Promise<Role & { _id: Types.ObjectId }> {
    let superAdminRole = await this.roleModel.findOne({ name: 'superadmin' });
    if (!superAdminRole) {
      const allPermissions = await this.permissionModel.find();
      superAdminRole = await this.roleModel.create({
        name: 'superadmin',
        description: 'Rol con acceso total al sistema',
        permissions: allPermissions.map(p => p._id),
      });
      console.log('Rol SuperAdmin creado exitosamente');
    }
    return superAdminRole as Role & { _id: Types.ObjectId };
  }
} 