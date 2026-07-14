import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LicensesService } from './licenses.service';
import { GenerateLicenseDto } from './dto/generate-license.dto';
import { ValidateLicenseDto } from './dto/validate-license.dto';
import { RenewLicenseDto } from './dto/renew-license.dto';
import { UpdateClientConfigDto } from './dto/update-client-config.dto';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('licenses')
export class LicensesController {
  constructor(
    private readonly licensesService: LicensesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ========================================
  // ENDPOINTS PUBLICS (pas d'auth requise)
  // ========================================

  // Valider une licence (appelé par le client au démarrage)
  @Public()
  @Post('validate')
  async validate(@Body() dto: ValidateLicenseDto) {
    return this.licensesService.validate(dto.licenseKey);
  }

  // Resolver un tenant par subdomain (pour multi-tenant SaaS)
  @Public()
  @Get('resolve/:subdomain')
  async resolveBySubdomain(@Param('subdomain') subdomain: string) {
    return this.licensesService.resolveBySubdomain(subdomain);
  }

  // Obtenir le statut d'une licence
  @Public()
  @Get(':licenseKey/status')
  async getStatus(@Param('licenseKey') licenseKey: string) {
    return this.licensesService.getStatus(licenseKey);
  }

  // Obtenir la config client (pour personnalisation tickets/dashboard)
  @Public()
  @Get(':licenseKey/config')
  async getConfig(@Param('licenseKey') licenseKey: string) {
    return this.licensesService.getConfig(licenseKey);
  }

  // Lister les magasins d'une licence
  @Public()
  @Get(':licenseKey/stores')
  async listStores(@Param('licenseKey') licenseKey: string) {
    return this.licensesService.listStores(licenseKey);
  }

  // ========================================
  // ENDPOINTS ADMIN (auth requise + rôle boss)
  // ========================================

  // Générer une nouvelle licence
  @Post('generate')
  async generate(@Body() dto: GenerateLicenseDto) {
    return this.licensesService.generate(dto);
  }

  // Lister toutes les licences
  @Get()
  async findAll() {
    return this.licensesService.findAll();
  }

  // Renouveler une licence
  @Post('renew')
  async renew(@Body() dto: RenewLicenseDto) {
    return this.licensesService.renew(dto);
  }

  // Suspendre une licence
  @Patch(':licenseKey/suspend')
  async suspend(@Param('licenseKey') licenseKey: string) {
    return this.licensesService.suspend(licenseKey);
  }

  // Réactiver une licence
  @Patch(':licenseKey/reactivate')
  async reactivate(@Param('licenseKey') licenseKey: string) {
    return this.licensesService.reactivate(licenseKey);
  }

  // Annuler une licence
  @Patch(':licenseKey/cancel')
  async cancel(@Param('licenseKey') licenseKey: string) {
    return this.licensesService.cancel(licenseKey);
  }

  // Mettre à jour la config client
  @Public()
  @Patch(':licenseKey/config')
  async updateConfig(
    @Param('licenseKey') licenseKey: string,
    @Body() dto: UpdateClientConfigDto,
  ) {
    return this.licensesService.updateConfig(licenseKey, dto);
  }

  // Upload logo client
  @Public()
  @Post(':licenseKey/upload-logo')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Param('licenseKey') licenseKey: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Upload vers Cloudinary
    const logoUrl = await this.cloudinaryService.uploadImage(file);

    // Mettre à jour la config
    await this.licensesService.updateConfig(licenseKey, { logoUrl });

    return { logoUrl };
  }

  // Ajouter un magasin (Multi-Store)
  @Post(':licenseKey/stores')
  async addStore(
    @Param('licenseKey') licenseKey: string,
    @Body() body: { name: string; address?: string; phone?: string; city?: string },
  ) {
    if (!body.name) throw new BadRequestException('Le nom du magasin est requis');
    return this.licensesService.addStore(licenseKey, body);
  }
}
