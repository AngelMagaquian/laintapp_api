import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../logger/logger.service';
import { UserDto } from '../users/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, 
    private jwtService: JwtService,
    private loggerService: LoggerService
  ) {}

  async validateUser(identifier: string, pass: string): Promise<UserDto> {
    try {
      const user = await this.usersService.findOne({ username: identifier }) || 
                  await this.usersService.findOne({ email: identifier });
      
      if (user && await this.usersService.validatePassword(pass, user.pass)) {
        const { pass, ...result } = user;
        // Registrar inicio de sesión exitoso
        await this.loggerService.createLog(
          result._id.toString(),
          'success', 
          `Inicio de sesión exitoso para el usuario ${result.username}`
        );
        return result as UserDto;
      }
      
      // Registrar intento fallido
      await this.loggerService.createLog(
        'system',
        'error',
        `Intento de inicio de sesión fallido para el identificador ${identifier}`
      );
      throw new UnauthorizedException('Invalid credentials');
    } catch (error) {
      // Registrar error en el proceso de autenticación
      await this.loggerService.createLog(
        'system',
        'error',
        `Error en el proceso de autenticación: ${error.message}`
      );
      throw error;
    }
  }

  async login(user: UserDto) {
    try {
      const { pass, ...userData } = user;
      
      // Obtener los permisos del usuario y formatearlos correctamente
      const userWithPermissions = await this.usersService.getUserPermissions(userData._id.toString());
      const permissions = userWithPermissions.map((perm: any) => ({
        module: perm.permission.module,
        action: perm.permission.action
      })).filter(perm => perm.module && perm.action);
      
      const payload = {
        _id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        permissions
      };

      return { 
        access_token: this.jwtService.sign(payload, { secret: process.env.JWT_SECRET}),
        user: payload
      };
    } catch (error) {
      // Registrar error en el proceso de login
      await this.loggerService.createLog(
        user._id.toString(),
        'error',
        `Error en el proceso de login: ${error.message}`
      );
      throw error;
    }
  }
}