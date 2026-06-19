import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Login caissier — public (pas de token requis)
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Lister les caissiers (pour l'écran de sélection) — public
  @Public()
  @Get('cashiers')
  async listCashiers() {
    return this.authService.listCashiers();
  }
}
