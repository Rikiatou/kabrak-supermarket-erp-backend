import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface AuthUser {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  tenantId?: string | null;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  // Login par numéro employé + PIN
  async login(loginDto: LoginDto): Promise<{ user: AuthUser; token: string }> {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: loginDto.employeeNumber },
    });

    if (!employee) {
      throw new UnauthorizedException('Numéro employé introuvable');
    }

    if (employee.status !== 'active') {
      throw new UnauthorizedException('Compte inactif');
    }

    if (!employee.pin || employee.pin !== loginDto.pin) {
      throw new UnauthorizedException('PIN incorrect');
    }

    const user: AuthUser = {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      department: employee.department,
      tenantId: employee.tenantId || null,
    };

    // Token simple (en production: JWT)
    const token = Buffer.from(
      JSON.stringify({ id: user.id, tenantId: user.tenantId, ts: Date.now() })
    ).toString('base64');

    return { user, token };
  }

  // Vérifier un token
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = JSON.parse(
        Buffer.from(token, 'base64').toString('utf-8')
      );
      const employee = await this.prisma.employee.findUnique({
        where: { id: decoded.id },
      });

      if (!employee || employee.status !== 'active') {
        return null;
      }

      return {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        department: employee.department,
        tenantId: employee.tenantId || decoded.tenantId || null,
      };
    } catch {
      return null;
    }
  }

  // Lister les employés (pour l'écran de login - sélection caissier)
  async listCashiers(tenantId?: string) {
    return this.prisma.employee.findMany({
      where: {
        status: 'active',
        role: { in: ['cashier', 'boss', 'accountant', 'stockist', 'manager'] },
        ...(tenantId ? { tenantId } : {}),
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
