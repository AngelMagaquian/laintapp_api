import { Controller, Post, Body, UseGuards, Get, Patch, Param, Request, Put, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { PermissionAction } from '../schemas/permission.schema';
import { Types } from 'mongoose';
import { RemovePermissionDto } from './dto/remove-permission.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuario creado exitosamente',
    type: CreateUserDto 
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async register(@Body() createUserDto: CreateUserDto, @Request() req) {
    try {
      return await this.usersService.createUser(createUserDto, req.user._id);
    } catch (error) {
      console.error('Error en register:', error);
      throw error;
    }
  }

  @Get('findAll')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de usuarios obtenida exitosamente',
    type: [CreateUserDto]
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Post('add-permission/:userId')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Agregar un permiso a un usuario' })
  @ApiResponse({ status: 200, description: 'Permiso agregado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async addUserPermission(
    @Param('userId') userId: string,
    @Body() permission: { _id: string, temporal?: { status: boolean; exp_date?: Date } },
    @Request() req
  ) {
    return this.usersService.addUserPermission(userId, permission, req.user._id);
  }

  @Delete('remove-permission/:userId')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Eliminar un permiso de un usuario' })
  @ApiResponse({ status: 200, description: 'Permiso eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async removeUserPermission(
    @Param('userId') userId: string,
    @Body() permission: RemovePermissionDto,
    @Request() req
  ) {
    console.log('Datos recibidos:', { userId, permission });
    return this.usersService.removeUserPermission(userId, permission._id, req.user._id);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('profile', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cambiar contraseña de un usuario' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    try {
      return await this.usersService.changePassword(changePasswordDto);
    } catch (error) {
      console.error('Error en changePassword:', error);
      throw error;
    }
  }

  @Get(':userId/permissions')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener permisos de un usuario' })
  @ApiResponse({ status: 200, description: 'Permisos obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.usersService.getUserPermissions(userId);
  }

  @Put('/profile/:userId')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('profile', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Actualizar perfil de un usuario' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async updateProfile(@Param('userId') userId: string, @Body() profile: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, profile);
  }


  @Get('findAllByRole/:role')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener usuarios por rol' })
  @ApiResponse({ status: 200, description: 'Usuarios obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async getUsersByRole(@Param('role') role: string) {
    return this.usersService.getUsersByRole(role);
  }

  @Get('findOne/:user')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener un usuario por ID o username' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuario encontrado exitosamente',
    type: CreateUserDto 
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('user') user: string) {
    console.log(user);
    const type = Types.ObjectId.isValid(user) ? '_id' : 'username';
    return await this.usersService.findOneByUsernameOrId(user, type);
  }

  @Patch('changeRole/:userId')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cambiar rol de un usuario' })
  @ApiResponse({ status: 200, description: 'Rol cambiado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async changeRole(@Param('userId') userId: string, @Body() role: any, @Request() req) {
    const { roleId, isStrict } = role;
    return this.usersService.changeRole(userId, roleId, isStrict, req.user._id);
  }

  @Patch('changeIsStrict/:userId')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('users', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cambiar isStrict de un usuario' })
  @ApiResponse({ status: 200, description: 'isStrict cambiado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async changeIsStrict(@Param('userId') userId: string, @Body() changeIsStrictDto: any, @Request() req) {
    return this.usersService.changeIsStrict(userId, changeIsStrictDto.isStrict, req.user._id);
  }
}


