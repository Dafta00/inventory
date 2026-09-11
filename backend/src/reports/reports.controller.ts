import { Controller, ForbiddenException, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REPORTS_VIEW)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('inventory')
  inventory(
    @Query() filters: ReportFiltersDto,
    @Query('format') format: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    return this.respond(() => this.service.inventoryReport(filters), format, user, res, 'inventory-report');
  }

  @Get('sales')
  sales(
    @Query() filters: ReportFiltersDto,
    @Query('format') format: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    return this.respond(() => this.service.salesReport(filters), format, user, res, 'sales-report');
  }

  @Get('purchases')
  purchases(
    @Query() filters: ReportFiltersDto,
    @Query('format') format: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    return this.respond(() => this.service.purchaseReport(filters), format, user, res, 'purchase-report');
  }

  @Get('profit-loss')
  profitLoss(@Query() filters: ReportFiltersDto) {
    return this.service.profitAndLossReport(filters);
  }

  @Get('stock-valuation')
  stockValuation(
    @Query() filters: ReportFiltersDto,
    @Query('format') format: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    return this.respond(
      () => this.service.stockValuationReport(filters),
      format,
      user,
      res,
      'stock-valuation',
    );
  }

  private async respond(
    load: () => Promise<{ rows: Record<string, unknown>[]; totals: unknown; [k: string]: unknown }>,
    format: string | undefined,
    user: AuthenticatedUser,
    res: Response,
    filename: string,
  ) {
    if (format === 'csv') {
      // Exporting is a distinct, more sensitive capability than viewing on
      // screen (it produces a downloadable file of the underlying rows), so
      // it requires its own permission rather than piggy-backing on
      // reports.view. Enforced here, not just hidden in the UI.
      const canExport =
        user.roleName === 'Super Admin' || user.permissions.includes(PERMISSIONS.REPORTS_EXPORT);
      if (!canExport) {
        throw new ForbiddenException(`Missing required permission(s): ${PERMISSIONS.REPORTS_EXPORT}`);
      }
    }

    const data = await load();
    if (format === 'csv') {
      const csv = this.service.toCsv(data.rows);
      res.header('Content-Type', 'text/csv');
      res.attachment(`${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csv);
    }
    return res.json(data);
  }
}
