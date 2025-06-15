import { Controller, Post, Body, UseGuards, Request, Get, Param, Put } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { PermissionAction } from '../schemas/permission.schema';
import { Role } from 'src/schemas/role.schema';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get('findAll')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener todos los roles' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de roles obtenida exitosamente',
    type: [CreateRoleDto]
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get('findOne/:identifier')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener un rol por su ID' })
  @ApiResponse({ status: 200, description: 'Rol obtenido exitosamente', type: CreateRoleDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async findOne(@Param('identifier') identifier: string) {
    return this.rolesService.findOne(identifier);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('roles', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiResponse({ 
    status: 201, 
    description: 'Rol creado exitosamente',
    type: CreateRoleDto 
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async create(@Body() createRoleDto: CreateRoleDto, @Request() req) {
    console.log('Datos recibidos en el controlador:', createRoleDto);
    console.log('Usuario que hace la petición:', req.user);
    try {
      const result = await this.rolesService.createRole(createRoleDto, req.user._id);
      console.log('Rol creado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('Error en el controlador al crear rol:', error);
      throw error;
    }
  }

  @Put('update')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('roles', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente', type: CreateRoleDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async update(@Body() updateRoleDto: any) {
    console.log('Datos recibidos en el controlador:', updateRoleDto);
    try {
      const result = await this.rolesService.updateRole(updateRoleDto);
      return result;
    } catch (error) {
      throw error;
    }
  }
} 