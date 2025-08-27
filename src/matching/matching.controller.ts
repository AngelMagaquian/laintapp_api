import { Controller, Post, UseGuards, Body, Get, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { PermissionAction } from '../schemas/permission.schema';
import { MatchingService } from './matching.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { MatchResult } from './dto/matching-file';
import { MatchingResponseDto, FormattedMatchingDto } from './dto/matching-response.dto';

class MatchingDto {
  @ApiProperty({ 
    description: 'Array de datos XRP',
    type: [Object],
    additionalProperties: true
  })
  @IsArray()
  xrpArray: any[];

  @ApiProperty({ 
    description: 'Array de datos del proveedor',
    type: [Object],
    additionalProperties: true
  })
  @IsArray()
  providerArray: any[];
}

@ApiTags('matching')
@Controller('matching')
@ApiBearerAuth()
export class MatchingController {
    constructor(private readonly matchingService: MatchingService) {}

    @Post('process')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.CREATE)
    @ApiOperation({ summary: 'Procesar el matching entre XRP y proveedores' })
    @ApiResponse({ 
      status: 201, 
      description: 'Matching procesado exitosamente',
      type: MatchingResponseDto
    })
    async processMatching(@Body() matchingDto: MatchingDto): Promise<MatchingResponseDto> {
        return this.matchingService.matchingProcess(matchingDto.xrpArray, matchingDto.providerArray);
    }

    @Post('save-matching')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.CREATE)
    @ApiOperation({ summary: 'Guardar los resultados del matching' })
    @ApiResponse({ 
      status: 201, 
      description: 'Resultados del matching guardados exitosamente'
    })
    async saveMatchingResults(@Body() matchingResults: MatchResult[]): Promise<any> {
      console.log("entroooo")
        return this.matchingService.saveMatchingResults(matchingResults);
    }

    @Get('get-matching/:startDate/:endDate/:provider')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    @ApiOperation({ summary: 'Obtener los resultados del matching' })
    @ApiResponse({ 
      status: 200, 
      description: 'Resultados del matching obtenidos exitosamente',
      type: [FormattedMatchingDto]
    })
    async getMatchingResults(@Param('startDate') startDate: string, @Param('endDate') endDate: string, @Param('provider') provider: string): Promise<FormattedMatchingDto[]> {
      console.log({startDate, endDate, provider});
      
      // Convertir los strings de fecha a objetos Date
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // Validar que las fechas sean válidas
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error('Formato de fecha inválido');
      }
      
      return this.matchingService.getMatchingResults(startDateObj, endDateObj, provider);
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
        return this.matchingService.saveNotMatchingResults(notMatchingProviders);
    }


    @Get('get-not-matching/:date')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.READ)
    @ApiOperation({ summary: 'Obtener los proveedores sin match' })
    @ApiResponse({ 
      status: 200, 
      description: 'Proveedores sin match obtenidos exitosamente'
    })
    async getNotMatchingResults(@Param('date') date: string): Promise<any> {
        console.log({date});
        
        // Convertir el string de fecha a objeto Date
        const dateObj = new Date(date);
        
        // Validar que la fecha sea válida
        if (isNaN(dateObj.getTime())) {
          throw new Error('Formato de fecha inválido');
        }
        
        return this.matchingService.getNotMatchingResults(dateObj);
    }

    @Delete('delete-not-matching/:_id')
    @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
    @RequirePermission('matching', PermissionAction.DELETE)
    @ApiOperation({ summary: 'Eliminar los proveedores sin match' })
    @ApiResponse({ 
      status: 200, 
      description: 'Proveedores sin match eliminados exitosamente'
    })
    async deleteNotMatchingResults(@Param('_id') _id: string): Promise<any> {
        return this.matchingService.deleteNotMatchingResults(_id);
    }
}



