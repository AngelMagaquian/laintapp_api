import { Controller, Post, UseGuards, Body, Get, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPermissionsGuard } from '../auth/jwt-permissions.guard';
import { RequirePermission } from '../common/decorators/require_permission.decorator';
import { PermissionAction } from '../schemas/permission.schema';
import { MatchingService } from './matching.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
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

class PayrollMatchingDto {
  @ApiProperty({ description: 'Nombre del proveedor' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Datos de nómina a matchear', type: [Object] })
  @IsArray()
  data: any[];
}

@ApiTags('matching')
@Controller('matching')
@ApiBearerAuth()
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) { }

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

  @Get('get-matching/:startDate/:endDate/:provider/:status')
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('matching', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener los resultados del matching' })
  @ApiResponse({
    status: 200,
    description: 'Resultados del matching obtenidos exitosamente',
    type: [FormattedMatchingDto]
  })
  async getMatchingResults(@Param('startDate') startDate: string, @Param('endDate') endDate: string, @Param('provider') provider: string, @Param('status') status: string): Promise<FormattedMatchingDto[]> {
    // Convertir los strings de fecha a objetos Date
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    console.log({ startDateObj, endDateObj, provider, status });
    // Validar que las fechas sean válidas
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Formato de fecha inválido');
    }

    return this.matchingService.getMatchingResults(startDateObj, endDateObj, provider, status);
  }


  @Post('payroll-matching')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false }))
  @UseGuards(JwtAuthGuard, JwtPermissionsGuard)
  @RequirePermission('matching', PermissionAction.READ)
  @ApiOperation({ summary: 'Obtener los resultados del matching de la nómina' })
  @ApiResponse({
    status: 200,
    description: 'Resultados del matching de la nómina obtenidos exitosamente'
  })
  async getPayrollMatching(@Body() payload: PayrollMatchingDto): Promise<any> {
    console.log('payroll-matching payload:', typeof payload, Array.isArray((payload as any)?.data));
    console.log({ payload });
    if (payload.provider == 'fiserv') {
      return this.matchingService.processFiservPayrollMatching(payload.data);
    } else if (payload.provider == 'naranja') {
      return this.matchingService.processNaranjaPayrollMatching(payload.data);
    } else if (payload.provider == 'MODO') {
      return this.matchingService.processModoPayrollMatching(payload.data);
    } else {
      return this.matchingService.getPayrollMatching(payload.provider, payload.data);
    }
  }
}
