import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('sales-over-time')
  getSalesOverTime(@Query('days') days = '30') {
    return this.service.getSalesOverTime(parseInt(days, 10) || 30);
  }

  @Get('purchases-over-time')
  getPurchasesOverTime(@Query('days') days = '30') {
    return this.service.getPurchasesOverTime(parseInt(days, 10) || 30);
  }

  @Get('revenue-vs-expenses')
  getRevenueVsExpenses(@Query('months') months = '6') {
    return this.service.getRevenueVsExpenses(parseInt(months, 10) || 6);
  }

  @Get('top-products')
  getTopSellingProducts(@Query('days') days = '30', @Query('limit') limit = '10') {
    return this.service.getTopSellingProducts(parseInt(days, 10) || 30, parseInt(limit, 10) || 10);
  }

  @Get('inventory-by-category')
  getInventoryByCategory() {
    return this.service.getInventoryByCategory();
  }

  @Get('stock-movement-trends')
  getStockMovementTrends(@Query('days') days = '30') {
    return this.service.getStockMovementTrends(parseInt(days, 10) || 30);
  }

  @Get('recent-activity')
  getRecentActivity() {
    return this.service.getRecentActivity();
  }
}
