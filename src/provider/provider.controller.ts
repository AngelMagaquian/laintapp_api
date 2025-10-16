import { Body, Controller, Get, Post, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { PermissionAction } from '../schemas/permission.schema';
import { ProviderService } from './provider.service';
import { CreateProviderDto, UpdateProviderDto, AddCardTypeDto } from './dto/provider';
import { Provider } from '../schemas/provider.schema';

@ApiTags('provider')
@Controller('provider')
@ApiBearerAuth()
export class ProviderController {
    constructor(private readonly providerService: ProviderService) {}

    @Get()
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('provider', PermissionAction.READ)
    @ApiOperation({ summary: 'Obtener todos los proveedores' })
    @ApiResponse({ 
      status: 200, 
      description: 'Proveedores obtenidos exitosamente',
      type: [Provider]
    })
    async findAll(): Promise<Provider[]> {
        return this.providerService.findAll();
    }

    @Post()
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('provider', PermissionAction.CREATE)
    @ApiOperation({ summary: 'Crear un nuevo proveedor' })
    @ApiResponse({ 
      status: 201, 
      description: 'Proveedor creado exitosamente',
      type: Provider
    })
    async create(@Body() createProviderDto: CreateProviderDto): Promise<Provider> {
        return this.providerService.create(createProviderDto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('provider', PermissionAction.UPDATE)
    @ApiOperation({ summary: 'Actualizar un proveedor' })
    @ApiResponse({ 
      status: 200, 
      description: 'Proveedor actualizado exitosamente',
      type: Provider
    })
    async update(@Param('id') id: string, @Body() updateProviderDto: UpdateProviderDto): Promise<Provider> {
        return this.providerService.update(id, updateProviderDto);
    }

    @Post('add-card-type')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('provider', PermissionAction.UPDATE)
    @ApiOperation({ summary: 'Añadir un nuevo tipo de tarjeta a un proveedor' })
    @ApiResponse({ 
      status: 201, 
      description: 'Tipo de tarjeta añadido exitosamente',
      type: Provider
    })
    async addCardType(@Body() addCardTypeDto: any): Promise<Provider> {
        console.log('Received DTO:', addCardTypeDto);
        

        return this.providerService.addCardType(addCardTypeDto.providerId, addCardTypeDto.cardType);
    }
}
