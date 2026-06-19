import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { SetMarkdownDto } from './dto/set-markdown.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.productsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 100,
    );
  }

  @Get('search')
  search(@Query() searchDto: SearchProductDto) {
    return this.productsService.search(searchDto);
  }

  @Get('stats')
  getStats() {
    return this.productsService.getStats();
  }

  @Get('alerts')
  getAlerts() {
    return this.productsService.getStockAlerts();
  }

  @Get('markdowns')
  getMarkdowns(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.productsService.getMarkdowns(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
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
