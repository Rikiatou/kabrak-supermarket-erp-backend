import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GenerateLicenseDto } from './dto/generate-license.dto';
import { RenewLicenseDto } from './dto/renew-license.dto';
import { UpdateClientConfigDto } from './dto/update-client-config.dto';
import * as crypto from 'crypto';

// Modules inclus dans TOUTES les licences (Standard + Multi-Store)
export const ALL_MODULES = [
  'pos',
  'inventory',
  'purchases',
  'suppliers',
  'customers',
  'loyalty',
  'reports',
  'dashboard',
  'invoices',
  'employees',
  'cashiers',
  'schedules',
  'scanner',
  'losses',
  'accounting',
  'ai',
  'import',
  'notifications',
  'offline_sync',
  'cloud_backup',
];

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // GÉNÉRATION DE LICENCE
  // ========================================
  async generate(dto: GenerateLicenseDto) {
    // Vérifier qu'il n'existe pas déjà une licence active pour ce client
    const existing = await this.prisma.license.findFirst({
      where: {
        clientEmail: dto.clientEmail,
        status: { in: ['ACTIVE', 'SUSPENDED'] },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Une licence active existe déjà pour ${dto.clientEmail}: ${existing.licenseKey}`
      );
    }

    const maxStores = dto.type === 'STANDARD' ? 1 : (dto.maxStores ?? 1);
    if (dto.type === 'MULTI_STORE' && maxStores < 2) {
      throw new BadRequestException('MULTI_STORE nécessite au moins 2 magasins');
    }

    const licenseKey = this.generateLicenseKey(dto);
    const expiresAt = this.computeExpirationDate(dto.durationMonths);
    const clientSlug = dto.clientName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 12);

    // Generer un subdomain si non fourni
    let subdomain = dto.subdomain;
    if (!subdomain) {
      subdomain = dto.clientName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
    }
    // Verifier que le subdomain est unique
    const existingSubdomain = await this.prisma.license.findUnique({
      where: { subdomain },
    });
    if (existingSubdomain) {
      subdomain = `${subdomain}-${Date.now().toString(36).slice(-4)}`;
    }

    // Créer la licence + config client par défaut + 1 magasin par défaut
    const license = await this.prisma.license.create({
      data: {
        licenseKey,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone,
        clientAddress: dto.clientAddress,
        subdomain,
        type: dto.type,
        maxStores,
        durationMonths: dto.durationMonths,
        expiresAt,
        status: 'ACTIVE',
        internalNotes: dto.internalNotes,
        // Créer la config client par défaut
        config: {
          create: {
            supermarketName: dto.clientName,
            primaryColor: '#2563eb',
            currency: 'FCFA',
            taxRate: 15.5,
            receiptFooter: 'Merci de votre visite !',
            receiptShowLogo: true,
            enableLoyalty: true,
            enableAutoPrint: false,
          },
        },
        // Créer le magasin principal (code unique basé sur le slug client)
        stores: {
          create: [
            {
              name: dto.clientName,
              code: `${clientSlug}-001`,
              isActive: true,
            },
          ],
        },
      },
      include: {
        config: true,
        stores: true,
      },
    });

    return {
      licenseKey: license.licenseKey,
      type: license.type,
      clientName: license.clientName,
      maxStores: license.maxStores,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      status: license.status,
      stores: license.stores,
      config: license.config,
    };
  }

  // ========================================
  // VALIDATION DE LICENCE (PUBLIC)
  // ========================================
  // ========================================
  // RÉSOLUTION TENANT PAR SUBDOMAIN
  // ========================================
  async resolveBySubdomain(subdomain: string) {
    const license = await this.prisma.license.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      include: {
        config: true,
        stores: { where: { isActive: true } },
      },
    });

    if (!license) {
      throw new NotFoundException(`Aucun client trouvé pour ${subdomain}.kabrak-retail.com`);
    }

    if (license.status !== 'ACTIVE') {
      throw new BadRequestException(`Ce compte est ${license.status.toLowerCase()}. Contactez le support.`);
    }

    // Retourner les infos publiques (pas de licenseKey)
    return {
      tenantId: license.id,
      clientName: license.clientName,
      subdomain: license.subdomain,
      supermarketName: license.config?.supermarketName || license.clientName,
      logoUrl: license.config?.logoUrl || null,
      primaryColor: license.config?.primaryColor || '#2563eb',
      currency: license.config?.currency || 'FCFA',
      stores: license.stores.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        city: s.city,
      })),
      expiresAt: license.expiresAt,
    };
  }

  async validate(licenseKey: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
      include: {
        config: true,
        stores: { where: { isActive: true } },
      },
    });

    if (!license) {
      throw new NotFoundException('Licence introuvable');
    }

    const now = new Date();
    const isExpired = now > license.expiresAt;

    // Mettre à jour le statut si expirée
    if (isExpired && license.status === 'ACTIVE') {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Licence expirée');
    }

    if (license.status === 'SUSPENDED') {
      throw new BadRequestException('Licence suspendue. Contactez le support.');
    }

    if (license.status === 'CANCELLED') {
      throw new BadRequestException('Licence annulée');
    }

    if (license.status === 'EXPIRED' || isExpired) {
      throw new BadRequestException('Licence expirée');
    }

    // Mettre à jour le tracking
    await this.prisma.license.update({
      where: { id: license.id },
      data: {
        lastCheckAt: now,
        activations: { increment: 1 },
      },
    });

    const daysRemaining = Math.ceil(
      (license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      valid: true,
      license: {
        licenseKey: license.licenseKey,
        clientName: license.clientName,
        type: license.type,
        maxStores: license.maxStores,
        modules: ALL_MODULES,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        daysRemaining,
        status: license.status,
      },
      config: license.config,
      stores: license.stores,
    };
  }

  // ========================================
  // RENOUVELLEMENT DE LICENCE
  // ========================================
  async renew(dto: RenewLicenseDto) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey: dto.licenseKey },
    });

    if (!license) {
      throw new NotFoundException('Licence introuvable');
    }

    // Calculer nouvelle date d'expiration
    // Si la licence n'est pas encore expirée, on ajoute à la date actuelle
    // Si elle est expirée, on part de maintenant
    const now = new Date();
    const baseDate = license.expiresAt > now ? license.expiresAt : now;
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + dto.durationMonths);

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: {
        expiresAt: newExpiresAt,
        status: 'ACTIVE',
        renewedAt: now,
        durationMonths: license.durationMonths + dto.durationMonths,
      },
    });

    return {
      licenseKey: updated.licenseKey,
      expiresAt: updated.expiresAt,
      status: updated.status,
      renewedAt: updated.renewedAt,
    };
  }

  // ========================================
  // STATUT DE LICENCE
  // ========================================
  async getStatus(licenseKey: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
      select: {
        licenseKey: true,
        clientName: true,
        type: true,
        maxStores: true,
        issuedAt: true,
        expiresAt: true,
        status: true,
        lastCheckAt: true,
        activations: true,
      },
    });

    if (!license) {
      throw new NotFoundException('Licence introuvable');
    }

    const now = new Date();
    const daysRemaining = Math.ceil(
      (license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      ...license,
      daysRemaining,
      isExpired: now > license.expiresAt,
    };
  }

  // ========================================
  // LISTER TOUTES LES LICENCES (ADMIN)
  // ========================================
  async findAll() {
    const licenses = await this.prisma.license.findMany({
      include: {
        config: { select: { supermarketName: true, primaryColor: true } },
        stores: { select: { id: true, name: true, code: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return licenses.map((l) => ({
      ...l,
      daysRemaining: Math.ceil(
        (l.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
      isExpired: now > l.expiresAt,
    }));
  }

  // ========================================
  // SUSPENDRE / RÉACTIVER / ANNULER
  // ========================================
  async suspend(licenseKey: string) {
    return this.updateStatus(licenseKey, 'SUSPENDED');
  }

  async reactivate(licenseKey: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
    });
    if (!license) throw new NotFoundException('Licence introuvable');
    if (new Date() > license.expiresAt) {
      throw new BadRequestException('Licence expirée — renouvelez-la d\'abord');
    }
    return this.updateStatus(licenseKey, 'ACTIVE');
  }

  async cancel(licenseKey: string) {
    return this.updateStatus(licenseKey, 'CANCELLED');
  }

  private async updateStatus(licenseKey: string, status: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
    });
    if (!license) throw new NotFoundException('Licence introuvable');

    return this.prisma.license.update({
      where: { id: license.id },
      data: { status },
    });
  }

  // ========================================
  // CONFIG CLIENT (Multi-Tenant)
  // ========================================
  async getConfig(licenseKey: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
      include: { config: true },
    });
    if (!license) throw new NotFoundException('Licence introuvable');
    if (!license.config) {
      // Créer config par défaut si manquante
      return this.prisma.clientConfig.create({
        data: {
          licenseId: license.id,
          supermarketName: license.clientName,
          currency: 'FCFA',
          taxRate: 15.5,
          receiptFooter: 'Merci de votre visite !',
          receiptShowLogo: true,
          enableLoyalty: true,
        },
      });
    }
    return license.config;
  }

  async updateConfig(licenseKey: string, dto: UpdateClientConfigDto) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
    });
    if (!license) throw new NotFoundException('Licence introuvable');

    // Upsert: créer si n'existe pas
    return this.prisma.clientConfig.upsert({
      where: { licenseId: license.id },
      create: {
        licenseId: license.id,
        supermarketName: dto.supermarketName ?? license.clientName,
        supermarketSlogan: dto.supermarketSlogan,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor ?? '#2563eb',
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        receiptHeader: dto.receiptHeader,
        receiptFooter: dto.receiptFooter ?? 'Merci de votre visite !',
        receiptShowLogo: dto.receiptShowLogo ?? true,
        invoiceFooter: dto.invoiceFooter,
        currency: dto.currency ?? 'FCFA',
        taxRate: dto.taxRate ?? 15.5,
        enableLoyalty: dto.enableLoyalty ?? true,
        enableAutoPrint: dto.enableAutoPrint ?? false,
      },
      update: dto,
    });
  }

  // ========================================
  // MAGASINS (Multi-Store)
  // ========================================
  async listStores(licenseKey: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
      include: { stores: { orderBy: { code: 'asc' } } },
    });
    if (!license) throw new NotFoundException('Licence introuvable');
    return license.stores;
  }

  async addStore(licenseKey: string, data: { name: string; address?: string; phone?: string; city?: string }) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
      include: { stores: true },
    });
    if (!license) throw new NotFoundException('Licence introuvable');

    if (license.stores.length >= license.maxStores) {
      throw new BadRequestException(
        `Limite atteinte: ${license.maxStores} magasin(s) maximum pour cette licence. ` +
        `Contactez KABRAK pour upgrader vers MULTI-STORE.`
      );
    }

    // Générer code STORE00X
    const nextNum = license.stores.length + 1;
    const code = `STORE${String(nextNum).padStart(3, '0')}`;

    return this.prisma.store.create({
      data: {
        licenseId: license.id,
        name: data.name,
        code,
        address: data.address,
        phone: data.phone,
        city: data.city,
        isActive: true,
      },
    });
  }

  // ========================================
  // HELPERS PRIVÉS
  // ========================================
  private generateLicenseKey(dto: GenerateLicenseDto): string {
    const year = new Date().getFullYear();
    const clientSlug = dto.clientName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 12);
    const typeCode = dto.type === 'STANDARD' ? 'STD' : 'MS';
    const hash = crypto
      .createHash('sha256')
      .update(`${dto.clientEmail}-${dto.clientName}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();
    return `KABRAK-${typeCode}-${year}-${clientSlug}-${hash}`;
  }

  private computeExpirationDate(durationMonths: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + durationMonths);
    return date;
  }
}
