import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SalesReturnsService } from './sales-returns.service';
import { CreateSalesReturnDto } from './dto/sales-return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('sales-returns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly service: SalesReturnsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  findAll(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.service.findAll({
      page: parseInt(page, 10) || 1,
      pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SALES_REFUND)
  create(@Body() dto: CreateSalesReturnDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }
}
