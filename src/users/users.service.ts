import { Injectable, InternalServerErrorException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Permission } from '../schemas/permission.schema';
/* import { Role } from '../schemas/role.schema'; */
import * as bcrypt from 'bcryptjs';
import { LoggerService } from '../logger/logger.service';
import { UserDto } from './dto/user.dto';
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';

interface PopulatedPermission {
  permission: {
    _id: Types.ObjectId;
    module: string;
    action: string;
  };
  temporal: {
    status: boolean;
    exp_date: Date | null;
  };
  createdDate: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    /* @InjectModel(Role.name) private roleModel: Model<Role> */
    private loggerService: LoggerService,
    private mailService: MailService
  ) {}

  async findOne(query: { username?: string; email?: string }): Promise<UserDto | undefined> {
    try {
      const user = await this.userModel.findOne(query).exec();
      return user ? (user.toObject() as unknown as UserDto) : undefined;
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOneByUsernameOrId(identifier: string, type: '_id' | 'username') {
    try {
      const query = type === '_id' ? { _id: new Types.ObjectId(identifier) } : { username: identifier };
      const user = await this.userModel.findOne(query)
        .populate({
          path: 'role',
          model: 'Role',
          select: 'name description'
        })
        .populate({
          path: 'permissions.permission',
          model: 'Permission',
          select: 'module action description'
        })
        .exec();

      if (!user) {
        throw new NotFoundException(`Usuario no encontrado con ${type === '_id' ? 'ID' : 'username'}: ${identifier}`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error al buscar usuario: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const users = await this.userModel.find()
        .populate({
          path: 'role',
          select: 'name description'
        })
        .populate({
          path: 'permissions.permission',
          select: 'module action'
        })
        .exec();

      // Transformar los resultados para asegurar valores por defecto
      return users.map(user => {
        const userObj = user.toObject();
        return {
          ...userObj,
          role: userObj.role || { name: '', description: '' },
          permissions: userObj.permissions || []
        };
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }    
  }

  async createUser(userData: { 
    username: string; 
    email: string; 
    pass: string; 
    name: string;
    lastname: string;
    phone: string;
    birthdate: Date;
    role?: string; 
    isStrict?: boolean; 
    permissions?: any[] 
  }, creatorId: string) {
    console.log('Datos recibidos en createUser:', JSON.stringify(userData, null, 2));
    const { 
      username, 
      email, 
      pass, 
      name,
      lastname,
      phone,
      birthdate,
      role, 
      isStrict = false, 
      permissions = [] 
    } = userData;
    
    try {
      // Validar fortaleza de la contraseña
      this.validatePasswordStrength(pass);
      
      const hashedPassword = await bcrypt.hash(pass, 10);

      // Agregar permisos de perfil por defecto
      const defaultProfilePermissions = [
        { module: 'profile', action: 'read' },
        { module: 'profile', action: 'update' },
        { module: 'profile-activity', action: 'read' }
      ];

      // Buscar o crear los permisos en la base de datos
      const permissionModel = this.userModel.db.model('Permission');
      const finalPermissions = [];

      // Si se proporciona un rol, buscar sus permisos
      if (role) {
        const roleModel = this.userModel.db.model('Role');
        const roleDoc = await roleModel.findById(role).populate({
          path: 'permissions',
          model: 'Permission',
          select: 'module action'
        });
        
        if (roleDoc && roleDoc.permissions) {
          // Agregar los permisos del rol
          for (const rolePerm of roleDoc.permissions) {
            finalPermissions.push({
              permission: rolePerm._id,
              temporal: { status: false, exp_date: null },
              createdDate: new Date()
            });
          }
        }
      }

      // Verificar si ya existen los permisos de perfil
      const existingPermissions = permissions.map(p => ({
        module: p.permission?.module || p.module,
        action: p.permission?.action || p.action
      }));

      const missingProfilePermissions = defaultProfilePermissions.filter(
        defaultPerm => !existingPermissions.some(
          existingPerm => existingPerm.module === defaultPerm.module && existingPerm.action === defaultPerm.action
        )
      );

      // Procesar permisos existentes
      for (const perm of permissions) {
        const permission = await permissionModel.findOne({
          module: perm.permission?.module || perm.module,
          action: perm.permission?.action || perm.action
        });

        if (permission) {
          finalPermissions.push({
            permission: permission._id,
            temporal: { status: false, exp_date: null },
            createdDate: new Date()
          });
        }
      }

      // Procesar permisos de perfil por defecto
      for (const perm of missingProfilePermissions) {
        let permission = await permissionModel.findOne({
          module: perm.module,
          action: perm.action
        });

        if (!permission) {
          permission = await permissionModel.create({
            module: perm.module,
            action: perm.action,
            description: `Permiso para ${perm.action} en ${perm.module}`
          });
        }

        finalPermissions.push({
          permission: permission._id,
          temporal: { status: false, exp_date: null },
          createdDate: new Date()
        });
      }

      console.log('Permisos finales:', JSON.stringify(finalPermissions, null, 2));

      const user = new this.userModel({
        username,
        email,
        pass: hashedPassword,
        name,
        lastname,
        phone,
        birthdate: new Date(birthdate),
        role: role ? new Types.ObjectId(role) : null,
        isStrict,
        permissions: finalPermissions,
        isActive: true
      });

      console.log('Usuario a guardar:', JSON.stringify(user, null, 2));

      const savedUser = await user.save();
      console.log('Usuario guardado exitosamente:', savedUser);

      // Crear log de la acción
      const description = `Se creó el usuario ${username} (${email}) con el rol ${role || 'sin rol'} y los permisos: ${JSON.stringify(finalPermissions)}`;
      await this.loggerService.createLog(creatorId, 'success', description);

      // Enviar correo de bienvenida
      await this.mailService.sendEmail(user.email, {
        title: '¡Bienvenido a nuestra plataforma!',
        subtitle: 'Tu cuenta ha sido creada exitosamente',
        message: `
          <p>Hola ${user.name},</p>
          <p>Nos complace darte la bienvenida a nuestra plataforma. Tu cuenta ha sido creada exitosamente.</p>
          <p>Puedes acceder a tu cuenta usando las siguientes credenciales:</p>
          <ul>
            <li><strong>Usuario:</strong> ${user.username}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Contraseña:</strong> ${pass}</li>
          </ul>
          <p>Por razones de seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p>Saludos cordiales,<br>El equipo de soporte</p>
        `
      });

      return savedUser;
    } catch (error) {
      console.error('Error detallado al crear usuario:', error);
      // Crear log del error
      await this.loggerService.createLog(
        creatorId, 
        'error', 
        `Error al crear usuario ${username}: ${error.message}`
      );
      throw new InternalServerErrorException(`Error al crear usuario: ${error.message}`);
    }
  }

  private validatePasswordStrength(password: string): void {
    // Expresión regular que verifica:
    // ^ - inicio de la cadena
    // (?=.*[A-Z]) - al menos una mayúscula
    // (?=.*\d) - al menos un número
    // (?=.*[!@#$%^&*(),.?":{}|<>]) - al menos un símbolo
    // .{6,} - mínimo 6 caracteres
    // $ - fin de la cadena
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;

    if (!passwordRegex.test(password)) {
      throw new UnauthorizedException({
        message: 'La contraseña debe tener al menos 6 caracteres, una mayúscula, un número y un símbolo especial',
      });
    }
  }

  async changeRole(userId: string, roleId: string, isStrict: boolean = false, creatorId: string) {
    console.log('Datos recibidos en changeRole:', { userId, roleId, isStrict, creatorId });
    try {
      const res = await this.userModel.findByIdAndUpdate(
        userId, 
        { role: new Types.ObjectId(roleId) }, 
        { new: true }
      ).populate({
        path: 'role',
        select: 'name description'
      }).populate({
        path: 'permissions.permission',
        select: 'module action description'
      }).select('-pass').exec();

      if (!res) {
        throw new NotFoundException('Usuario no encontrado');
      }
      
      await this.changeIsStrict(userId, isStrict, creatorId);
      

      await this.loggerService.createLog(
        creatorId,
        'success',
        `Rol cambiado exitosamente para el usuario ${res.username} a ${res.role && 'name' in res.role ? res.role.name : 'sin rol'}`
      );

      return res;
    } catch (error) {
      console.error('Error en changeRole:', error);
      await this.loggerService.createLog(
        creatorId,
        'error',
        `Error al cambiar el rol: ${error.message}`
      );
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al cambiar el rol');
    }
  }

  async validatePassword(pass: string, hash: string): Promise<boolean> {
    return bcrypt.compare(pass, hash);
  }

  async hasPermission(userId: string, module: string, action: 'read' | 'create' | 'update' | 'delete'): Promise<boolean> {
    const user = await this.userModel.findById(userId).populate({
      path: 'permissions.permission',
      model: 'Permission',
      select: 'module action'
    }).exec();

    if (!user) return false;

    const permission = user.permissions.find((perm: any) => 
      perm.permission.module === module && perm.permission.action === action
    );

    return !!permission;
  }

  async updatePermissions(userId: string, permissions: { module: string; action: string; temporal?: { status: boolean; exp_date?: Date } }) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new InternalServerErrorException('Usuario no encontrado');
      }

      const { module, action, temporal } = permissions;
      const permissionData = {
        permission: new Types.ObjectId(), // ID del permiso
        temporal: {
          status: temporal?.status || false,
          exp_date: temporal?.exp_date || null
        },
        createdDate: new Date()
      };

      // Actualizar o agregar el permiso
      const existingPermissionIndex = user.permissions.findIndex(p => p.permission.toString() === module);
      if (existingPermissionIndex >= 0) {
        user.permissions[existingPermissionIndex] = permissionData;
      } else {
        user.permissions.push(permissionData);
      }

      return await user.save();
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar permisos');
    }
  }

  async addUserPermission(userId: string, permission: { _id: string, temporal?: { status: boolean; exp_date?: Date } }, creatorId: string) {
    try {
      // Verificar que el usuario existe
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar que el permiso existe
      const permissionModel = this.userModel.db.model('Permission');
      const permissionDoc = await permissionModel.findById(new Types.ObjectId(permission._id));
      if (!permissionDoc) {
        throw new NotFoundException('Permiso no encontrado '+ permission._id);
      }

      // Verificar si el permiso ya existe en el usuario
      const exists = user.permissions.some(p => p.permission.toString() === permission._id);
      if (exists) {
        throw new BadRequestException('El usuario ya tiene este permiso');
      }

      // Crear el nuevo permiso con el ID correcto
      const newPermission = {
        permission: permissionDoc._id,
        temporal: {
          status: permission.temporal?.status || false,
          exp_date: permission.temporal?.exp_date || null
        },
        createdDate: new Date()
      };

      // Actualizar el usuario con el nuevo permiso
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $push: { permissions: newPermission } },
        { 
          new: true,
          runValidators: true
        }
      ).populate({
        path: 'permissions.permission',
        select: 'module action'
      });

      await this.loggerService.createLog(
        creatorId,
        'success',
        `Permiso ${permissionDoc.module}.${permissionDoc.action} agregado exitosamente para el usuario ${updatedUser.username}`
      );

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al agregar permiso');
    }
  }

  async removePermission(userId: string, permissionId: string, creatorId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Filtrar el permiso a eliminar
      user.permissions = user.permissions.filter(p => 
        p.permission.toString() !== permissionId
      );

      await user.save();

      await this.loggerService.createLog(
        creatorId,
        'success',
        `Permiso ${permissionId} eliminado exitosamente para el usuario ${user.username}`
      );

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar permiso');
    }
  }

  async getUserPermissions(userId: string) {
    try {
      const user = await this.userModel.findById(new Types.ObjectId(userId)).populate({
        path: 'permissions.permission',
        model: 'Permission',
        select: 'module action'
      }).exec();

      if (!user) {
        throw new InternalServerErrorException('Usuario no encontrado');
      }

      // Si no hay permisos, retornar array vacío
      if (!user.permissions || user.permissions.length === 0) {
        return [];
      }

      // Formatear los permisos para asegurar la estructura correcta
      return (user.permissions as unknown as PopulatedPermission[]).map(perm => ({
        permission: {
          module: perm.permission?.module || '',
          action: perm.permission?.action || ''
        }
      })).filter(perm => perm.permission.module && perm.permission.action);
    } catch (error) {
      console.error('Error en getUserPermissions:', error);
      throw new InternalServerErrorException('Error al obtener permisos: ' + error.message);
    }
  }

  async updateProfile(userId: string, profile: UpdateProfileDto) {
    try {
      // Si se proporciona una nueva contraseña, hashearla
      if (profile.pass) {
        this.validatePasswordStrength(profile.pass);
        profile.pass = await bcrypt.hash(profile.pass, 10);
      }

      const user = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: profile },
        { 
          new: true,
          runValidators: true
        }
      ).populate({
        path: 'role',
        select: 'name description'
      }).populate({
        path: 'permissions.permission',
        select: 'module action'
      }).exec();
      
      if (!user) {
        await this.loggerService.createLog(
          'system',
          'error',
          `Error al actualizar perfil: Usuario ${userId} no encontrado`
        );
        throw new InternalServerErrorException('Usuario no encontrado');
      }

      await this.loggerService.createLog(
        userId,
        'success',
        `Perfil actualizado exitosamente para el usuario ${user.username}`
      );

      return user;
    } catch (error) {
      // Manejar error de duplicado
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern)[0];
        const duplicateValue = error.keyValue[duplicateField];
        
        await this.loggerService.createLog(
          userId,
          'warning',
          `Intento de actualización de perfil fallido: El ${duplicateField} '${duplicateValue}' ya está en uso por otro usuario`
        );

        throw new InternalServerErrorException({
          message: 'Error de validación',
          details: `El ${duplicateField} ya está en uso por otro usuario`
        });
      }
      
      await this.loggerService.createLog(
        userId,
        'error',
        `Error al actualizar el perfil: ${error.message}`
      );
      throw new InternalServerErrorException('Error al actualizar el perfil');
    }
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    try {
      const user = await this.userModel.findById(changePasswordDto.userId);
      if (!user) {
        throw new InternalServerErrorException('Usuario no encontrado');
      }

      const isPasswordValid = await this.validatePassword(changePasswordDto.currentPass, user.pass);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Contraseña actual incorrecta');
      }

      user.pass = await bcrypt.hash(changePasswordDto.newPass, 10);
      await user.save();

      await this.loggerService.createLog(
        user._id.toString(),
        'success',
        `Contraseña actualizada exitosamente para el usuario ${user.username}`
      );

      return {
        message: 'Contraseña actualizada exitosamente'
      };
      
    } catch (error) {
      await this.loggerService.createLog(
        changePasswordDto.userId,
        'error',
        `Error al cambiar la contraseña: ${error.message}`
      );
      throw new InternalServerErrorException('Error al cambiar la contraseña');
    }
  }

  async getUsersByRole(role: string) {
    try {
      const users = await this.userModel.find({ role: new Types.ObjectId(role) }).select('-pass').populate({
        path: 'role',
        select: 'name description'
      }).populate({
        path: 'permissions.permission',
        select: 'module action'
      }).exec();
      return users;
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener usuarios por rol');
    }
  }

  async changeIsStrict(userId: string, isStrict: boolean, creatorId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const res = await this.userModel.findByIdAndUpdate(userId, { isStrict }, { new: true }).populate({
        path: 'role',
        select: 'name description'
      }).populate({
        path: 'permissions.permission',
        select: 'module action'
      }).exec();
      
      if (isStrict && user.role) {
        // Buscar el rol y sus permisos
        const roleModel = this.userModel.db.model('Role');
        const role = await roleModel.findById(user.role).populate({
          path: 'permissions',
          model: 'Permission',
          select: 'module action'
        });

        if (role && role.permissions) {
          // Crear nuevos permisos basados en el rol
          const newPermissions = role.permissions.map(permission => ({
            permission: permission._id,
            temporal: { status: false, exp_date: null },
            createdDate: new Date()
          }));

          // Actualizar los permisos del usuario
          await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { permissions: newPermissions } }
          );
        }

        
      }

      await this.loggerService.createLog(
        creatorId,
        'success',
        `isStrict cambiado exitosamente para el usuario ${userId}`
      );

      return res;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al cambiar isStrict');
    }
  }

  async removeUserPermission(userId: string, permissionId: string, creatorId: string) {
    try {
      // Verificar que el usuario existe
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar que el permiso existe
      const permissionModel = this.userModel.db.model('Permission');
      const permissionDoc = await permissionModel.findById(new Types.ObjectId(permissionId));
      if (!permissionDoc) {
        throw new NotFoundException('Permiso no encontrado ' + permissionId);
      }

      // Verificar si el permiso existe en el usuario
      const exists = user.permissions.some(p => p.permission.toString() === permissionId);
      if (!exists) {
        throw new BadRequestException('El usuario no tiene este permiso');
      }

      // Actualizar el usuario eliminando el permiso
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $pull: { permissions: { permission: new Types.ObjectId(permissionId) } } },
        { 
          new: true,
          runValidators: true
        }
      ).populate({
        path: 'permissions.permission',
        select: 'module action'
      });

      await this.loggerService.createLog(
        creatorId,
        'success',
        `Permiso ${permissionDoc.module}.${permissionDoc.action} eliminado exitosamente para el usuario ${updatedUser.username}`
      );

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar permiso');
    }
  }
}