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
import { MatchingResponseDto } from './dto/matching-response.dto';

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
        return this.matchingService.saveMatchingResults(matchingResults);
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
    async getNotMatchingResults(@Param('date') date: Date): Promise<any> {
        console.log({date});
        return this.matchingService.getNotMatchingResults(date);
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



