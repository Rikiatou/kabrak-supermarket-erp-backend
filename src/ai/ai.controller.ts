import { Controller, Get } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('stock-forecast')
  getStockForecast() {
    return this.aiService.getStockForecast();
  }

  @Get('recommendations')
  getRecommendations() {
    return this.aiService.getRecommendations();
  }

  @Get('sales-insights')
  getSalesInsights() {
    return this.aiService.getSalesInsights();
  }
}
