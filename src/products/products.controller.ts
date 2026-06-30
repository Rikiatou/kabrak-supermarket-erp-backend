import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { SetMarkdownDto } from './dto/set-markdown.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto, @Req() req: Request & { licenseKey?: string }) {
    return this.productsService.create(createProductDto, req.licenseKey);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { licenseKey?: string },
  ) {
    return this.productsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 100,
      req?.licenseKey,
    );
  }

  @Get('search')
  search(@Query() searchDto: SearchProductDto, @Req() req: Request & { licenseKey?: string }) {
    return this.productsService.search(searchDto, req.licenseKey);
  }

  // Top produits vendus (pour cache local du POS)
  @Get('bestsellers')
  getBestsellers(@Query('limit') limit?: string) {
    return this.productsService.getBestsellers(
      limit ? parseInt(limit) : 200,
    );
  }

  @Get('stats')
  getStats(@Req() req: Request & { licenseKey?: string }) {
    return this.productsService.getStats(req.licenseKey);
  }

  @Get('alerts')
  getAlerts(@Req() req: Request & { licenseKey?: string }) {
    return this.productsService.getStockAlerts(req.licenseKey);
  }

  @Get('markdowns')
  getMarkdowns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { licenseKey?: string },
  ) {
    return this.productsService.getMarkdowns(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      req?.licenseKey,
    );
  }

  @Post('markdowns/cleanup')
  cleanupExpiredMarkdowns() {
    return this.productsService.cleanupExpiredMarkdowns();
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/markdown')
  setMarkdown(@Param('id') id: string, @Body() dto: SetMarkdownDto) {
    return this.productsService.setMarkdown(id, dto);
  }

  @Delete(':id/markdown')
  removeMarkdown(@Param('id') id: string) {
    return this.productsService.removeMarkdown(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
