import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Kabrak Backend API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'PostgreSQL',
      sync: process.env.SYNC_ENABLED === 'true' ? 'enabled' : 'disabled',
    };
  }
}
