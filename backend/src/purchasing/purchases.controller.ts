import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreateQuickPurchaseDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('supplierId') supplierId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.findAll({
      page: parseInt(page, 10) || 1,
      pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
      supplierId,
      warehouseId,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  create(@Body() dto: CreateQuickPurchaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createQuickPurchase(dto, user.id);
  }
}
