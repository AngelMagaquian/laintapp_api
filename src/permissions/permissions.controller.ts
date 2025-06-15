import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionAction } from '../schemas/permission.schema';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get('findAll')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener todos los permisos' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de permisos obtenida exitosamente',
    type: [CreatePermissionDto]
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('permissions', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Crear un nuevo permiso' })
  @ApiResponse({ 
    status: 201, 
    description: 'Permiso creado exitosamente',
    type: CreatePermissionDto 
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos suficientes' })
  async create(@Body() createPermissionDto: CreatePermissionDto, @Request() req) {
    return this.permissionsService.createPermission(createPermissionDto, req.user._id);
  }
}
