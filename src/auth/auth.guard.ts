import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vérifier si la route est publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token d\'authentification manquant');
    }

    // Accepter "Bearer <token>" ou juste "<token>"
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    const user = await this.authService.verifyToken(token);

    if (!user) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    // Attacher l'utilisateur à la requête pour usage ultérieur
    request.user = user;

    // ========================================
    // VERIFICATION DE LICENCE (cote backend)
    // ========================================
    // Le frontend envoie x-license-key dans les headers
    // On verifie que la licence est valide et non expiree
    const licenseKey = request.headers['x-license-key'] as string | undefined;

    if (licenseKey) {
      try {
        const license = await this.prisma.license.findUnique({
          where: { licenseKey },
          select: { status: true, expiresAt: true },
        });

        if (license) {
          const now = new Date();
          const isExpired = now > license.expiresAt;

          if (license.status === 'EXPIRED' || isExpired) {
            throw new HttpException(
              { message: 'Licence expirée. Veuillez renouveler votre licence.', code: 'LICENSE_EXPIRED' },
              HttpStatus.PAYMENT_REQUIRED, // 402
            );
          }

          if (license.status === 'SUSPENDED') {
            throw new HttpException(
              { message: 'Licence suspendue. Contactez le support.', code: 'LICENSE_SUSPENDED' },
              HttpStatus.PAYMENT_REQUIRED, // 402
            );
          }

          if (license.status === 'CANCELLED') {
            throw new HttpException(
              { message: 'Licence annulée.', code: 'LICENSE_CANCELLED' },
              HttpStatus.PAYMENT_REQUIRED, // 402
            );
          }
        }
        // Si la licence n'existe pas en base locale, on laisse passer
        // (le client peut avoir une licence valide sur un autre serveur)
      } catch (e) {
        if (e instanceof HttpException) throw e;
        // Si la verification echoue (DB error), on laisse passer
        // pour ne pas bloquer le fonctionnement normal
      }
    }

    return true;
  }
}
