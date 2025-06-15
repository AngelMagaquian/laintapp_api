import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { module, action } = this.reflector.get('permissions', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log(user);
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Verificar si el usuario tiene el permiso en el token
    console.log(user);
    const hasPermission = user.permissions?.some(
      (perm: any) => perm.module === module && perm.action === action
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        message: 'Acceso denegado',
        details: `No tiene permiso para ${action} en ${module}`,
      });
    }

    return true;
  }
}
