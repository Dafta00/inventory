import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, MovementsQueryDto, TransferStockDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  getStock(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
  ) {
    return this.service.findStock({ productId, warehouseId, lowStockOnly: lowStockOnly === 'true' });
  }

  @Get('movements')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  getMovements(@Query() query: MovementsQueryDto) {
    return this.service.getMovements(query);
  }

  @Get('alerts')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  getAlerts() {
    return this.service.lowStockSummary();
  }

  @Post('adjust')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.adjustStock(dto, user.id);
  }

  @Post('transfer')
  @RequirePermissions(PERMISSIONS.INVENTORY_TRANSFER)
  transfer(@Body() dto: TransferStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transferStock(dto, user.id);
  }
}
