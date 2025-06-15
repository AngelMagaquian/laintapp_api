import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { GetLogsDto } from './dto/get-logs.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { PermissionAction } from '../schemas/permission.schema';

@ApiTags('Logs')
@ApiBearerAuth()
@Controller('logger')
export class LoggerController {
    constructor(private readonly loggerService: LoggerService) {}
    
    @Get()
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('logs', PermissionAction.READ)
    @ApiOperation({ summary: 'Obtener logs con filtros' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ['success', 'error', 'info', 'warning'] })
    @ApiQuery({ name: 'fromDate', required: false, type: Date })
    @ApiQuery({ name: 'toDate', required: false, type: Date })
    async getLogs(@Query() filters: GetLogsDto) {
        return await this.loggerService.getLogs(filters);
    }

    @Get('get-logs-by-user/:userId')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('logs', PermissionAction.READ)
    @ApiOperation({ summary: 'Obtener logs por usuario' })
    @ApiParam({ name: 'userId', description: 'ID del usuario' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getLogsByUser(
        @Param('userId') userId: string,
        @Query() pagination: PaginationDto
    ) {
        return await this.loggerService.getLogsByUser(userId, pagination);
    }
}
