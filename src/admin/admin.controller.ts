import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { LicensesService } from '../licenses/licenses.service';
import { GenerateLicenseDto } from '../licenses/dto/generate-license.dto';
import { RenewLicenseDto } from '../licenses/dto/renew-license.dto';
import { ConfigService } from '@nestjs/config';

@Controller('admin/erp')
export class AdminController {
  constructor(
    private readonly licensesService: LicensesService,
    private readonly configService: ConfigService,
  ) {}

  private checkAdminToken(token: string) {
    const adminToken = this.configService.get<string>('ADMIN_TOKEN');
    if (!adminToken || token !== adminToken) {
      throw new UnauthorizedException('Token admin invalide');
    }
  }

  // ========================================
  // AUTH
  // ========================================

  @Public()
  @Post('auth')
  async auth(
    @Body() body: { password: string },
  ) {
    const adminToken = this.configService.get<string>('ADMIN_TOKEN');
    if (!adminToken || body.password !== adminToken) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }
    return { success: true, token: adminToken };
  }

  // ========================================
  // DASHBOARD STATS
  // ========================================

  @Public()
  @Get('dashboard')
  async dashboard(@Headers('x-admin-token') token: string) {
    this.checkAdminToken(token);

    const licenses = await this.licensesService.findAll();

    const total = licenses.length;
    const active = licenses.filter(l => l.status === 'ACTIVE').length;
    const expired = licenses.filter(l => l.status === 'EXPIRED').length;
    const suspended = licenses.filter(l => l.status === 'SUSPENDED').length;
    const cancelled = licenses.filter(l => l.status === 'CANCELLED').length;

    // Expiration dans 30 jours
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringSoon = licenses.filter(l =>
      l.status === 'ACTIVE' &&
      l.expiresAt &&
      new Date(l.expiresAt) <= soon &&
      new Date(l.expiresAt) > new Date()
    ).length;

    // Licences récentes (7 derniers jours)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = licenses.filter(l =>
      new Date(l.issuedAt) >= weekAgo
    ).length;

    return {
      success: true,
      data: {
        total,
        active,
        expired,
        suspended,
        cancelled,
        expiringSoon,
        newThisWeek,
      },
    };
  }

  // ========================================
  // LICENCES - LISTE
  // ========================================

  @Public()
  @Get('licenses')
  async listLicenses(@Headers('x-admin-token') token: string) {
    this.checkAdminToken(token);
    const licenses = await this.licensesService.findAll();
    return { success: true, data: licenses };
  }

  // ========================================
  // LICENCES - DÉTAIL
  // ========================================

  @Public()
  @Get('licenses/:licenseKey')
  async getLicense(
    @Headers('x-admin-token') token: string,
    @Param('licenseKey') licenseKey: string,
  ) {
    this.checkAdminToken(token);
    const license = await this.licensesService.getStatus(licenseKey);
    return { success: true, data: license };
  }

  // ========================================
  // LICENCES - GÉNÉRER
  // ========================================

  @Public()
  @Post('licenses')
  async generateLicense(
    @Headers('x-admin-token') token: string,
    @Body() dto: GenerateLicenseDto,
  ) {
    this.checkAdminToken(token);
    const license = await this.licensesService.generate(dto);
    return { success: true, data: license };
  }

  // ========================================
  // LICENCES - SUSPENDRE
  // ========================================

  @Public()
  @Patch('licenses/:licenseKey/suspend')
  async suspend(
    @Headers('x-admin-token') token: string,
    @Param('licenseKey') licenseKey: string,
  ) {
    this.checkAdminToken(token);
    const result = await this.licensesService.suspend(licenseKey);
    return { success: true, data: result, message: 'Licence suspendue' };
  }

  // ========================================
  // LICENCES - RÉACTIVER
  // ========================================

  @Public()
  @Patch('licenses/:licenseKey/reactivate')
  async reactivate(
    @Headers('x-admin-token') token: string,
    @Param('licenseKey') licenseKey: string,
  ) {
    this.checkAdminToken(token);
    const result = await this.licensesService.reactivate(licenseKey);
    return { success: true, data: result, message: 'Licence réactivée ✅' };
  }

  // ========================================
  // LICENCES - RENOUVELER
  // ========================================

  @Public()
  @Post('licenses/:licenseKey/renew')
  async renew(
    @Headers('x-admin-token') token: string,
    @Param('licenseKey') licenseKey: string,
    @Body() body: { months: number },
  ) {
    this.checkAdminToken(token);
    if (!body.months || body.months < 1) {
      throw new BadRequestException('Nombre de mois invalide');
    }
    const result = await this.licensesService.renew({
      licenseKey,
      durationMonths: body.months,
    });
    return { success: true, data: result, message: `Licence renouvelée pour ${body.months} mois ✅` };
  }

  // ========================================
  // LICENCES - ANNULER
  // ========================================

  @Public()
  @Patch('licenses/:licenseKey/cancel')
  async cancel(
    @Headers('x-admin-token') token: string,
    @Param('licenseKey') licenseKey: string,
  ) {
    this.checkAdminToken(token);
    const result = await this.licensesService.cancel(licenseKey);
    return { success: true, data: result, message: 'Licence annulée' };
  }
}
