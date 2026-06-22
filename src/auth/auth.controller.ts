import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RateLimiterService } from './rate-limiter.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  // Login caissier — public (pas de token requis)
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    // Clé de rate limiting: IP + numéro employé
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
    const rateKey = `${ip}:${loginDto.employeeNumber}`;

    // Vérifier si verrouillé
    this.rateLimiter.checkLocked(rateKey);

    try {
      const result = await this.authService.login(loginDto);
      // Succès → reset
      this.rateLimiter.reset(rateKey);
      return result;
    } catch (err: any) {
      // Échec → enregistrer
      const { attemptsLeft, locked } = this.rateLimiter.recordFailure(rateKey);
      if (locked) {
        throw err; // checkLocked() throw au prochain appel
      }
      // Ajouter attemptsLeft au message d'erreur
      if (err?.response?.message) {
        err.response.message = `${err.response.message} (${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''})`;
        err.response.attemptsLeft = attemptsLeft;
      }
      throw err;
    }
  }

  // Lister les caissiers (pour l'écran de sélection) — public
  @Public()
  @Get('cashiers')
  async listCashiers() {
    return this.authService.listCashiers();
  }

  // Obtenir le statut de rate limiting pour un numéro employé
  @Public()
  @Get('rate-limit/:employeeNumber')
  async getRateLimitStatus(@Req() req: Request, @Body() body: { employeeNumber?: string }) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
    const employeeNumber = body?.employeeNumber || '';
    const rateKey = `${ip}:${employeeNumber}`;
    return this.rateLimiter.getStatus(rateKey);
  }
}
