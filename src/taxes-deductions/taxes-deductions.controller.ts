import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TaxesDeductionsService } from './taxes-deductions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { PermissionAction } from '../schemas/permission.schema';
import { CreateTaxesDeductionDto } from './dto/create-taxes-deductions.dto';

@ApiTags('taxes-deductions')
@Controller('taxes-deductions')
@ApiBearerAuth()
export class TaxesDeductionsController {
    constructor(private readonly taxesDeductionsService: TaxesDeductionsService) { }

    @Get()
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    @ApiOperation({ summary: 'Obtener deducciones por rango de fecha y proveedor' })
    @ApiResponse({ status: 200, description: 'Lista de deducciones obtenida exitosamente' })
    @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Fecha de inicio (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: true, type: String, description: 'Fecha de fin (YYYY-MM-DD)' })
    @ApiQuery({ name: 'provider', required: false, type: String, description: 'Proveedor (mercado_pago, nave, modo)' })
    async getTaxesDeductions(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('provider') provider?: string,
    ) {
        return this.taxesDeductionsService.getTaxesDeductions(startDate, endDate, provider);
    }

    @Post('grouped')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.CREATE)
    @ApiOperation({ summary: 'Guardar deducciones pre-agrupadas (ej. Fiserv, Naranja)' })
    @ApiResponse({ status: 201, description: 'Deducciones guardadas exitosamente' })
    @ApiBody({ type: [CreateTaxesDeductionDto] })
    async saveGroupedDeductions(
        @Body() createTaxesDeductionsDto: CreateTaxesDeductionDto[],
    ) {
        return this.taxesDeductionsService.saveGroupedDeductions(createTaxesDeductionsDto);
    }
}
