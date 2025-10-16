import { Controller, Get, UseGuards, Post, Body, Param, Delete } from '@nestjs/common';
import { NotMatchingService } from './not-matching.service';
import { JwtPermissionsGuard } from 'src/auth/jwt-permissions.guard';
import { PermissionAction } from 'src/schemas/permission.schema';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require_permission.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('not-matching')
@ApiBearerAuth()
@Controller('not-matching')
export class NotMatchingController {
    constructor(private readonly notMatchingService: NotMatchingService) {}

    @Get('get-not-matching-total')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    async getNotMatchingTotal(): Promise<any> {
        return this.notMatchingService.getNotMatchingTotal();
    }

    @Get('get-not-matching-total-by-dates')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    async getNotMatchingTotalByDates(): Promise<any> {
        return this.notMatchingService.getNotMatchingTotalByDates();
    }

    @Post('save-not-matching')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.CREATE)
    @ApiOperation({ summary: 'Guardar los proveedores sin match' })
    @ApiResponse({ 
      status: 201, 
      description: 'Proveedores sin match guardados exitosamente'
    })
    async saveNotMatchingResults(@Body() notMatchingProviders: any[]): Promise<any> {
        return this.notMatchingService.saveNotMatchingResults(notMatchingProviders);
    }

    @Get('get-not-matching/:date')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    @ApiOperation({ summary: 'Obtener los proveedores sin match por fecha' })
    @ApiResponse({ 
      status: 200, 
      description: 'Proveedores sin match obtenidos exitosamente'
    })
    async getNotMatchingResults(@Param('date') date: string): Promise<any> {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          throw new Error('Formato de fecha inválido');
        }
        return this.notMatchingService.getNotMatchingResults(dateObj);
    }

    @Delete('delete-not-matching/:_id')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.DELETE)
    @ApiOperation({ summary: 'Eliminar registro de proveedores sin match' })
    @ApiResponse({ 
      status: 200, 
      description: 'Proveedor sin match eliminado exitosamente'
    })
    async deleteNotMatchingResults(@Param('_id') _id: string): Promise<any> {
        return this.notMatchingService.deleteNotMatchingResults(_id);
    }
}
