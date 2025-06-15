import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body) {
    const {identifier, pass} = body;
    const user = await this.authService.validateUser(identifier.toLowerCase(), pass);
    return this.authService.login(user);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verificar si el token es válido' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async verifyToken(@Request() req) {
    return {
      valid: true,
      message: 'Token válido'
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    // En una implementación real, podrías agregar el token a una lista negra
    // o invalidarlo de alguna otra manera
    return { message: 'Logout exitoso' };
  }
}