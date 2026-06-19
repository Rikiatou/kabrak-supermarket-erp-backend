import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get()
  getRoot() {
    return {
      message: 'Kabrak Supermarket ERP - Backend API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        products: '/api/products',
        transactions: '/api/transactions',
        stock: '/api/stock',
        import: '/api/import',
        sync: '/api/sync',
      },
      documentation: 'Voir ARCHITECTURE.md',
    };
  }
}
