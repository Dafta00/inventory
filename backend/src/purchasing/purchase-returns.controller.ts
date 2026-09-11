import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PurchaseReturnsService } from './purchase-returns.service';
import { CreatePurchaseReturnDto } from './dto/purchase-return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('purchase-returns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(private readonly service: PurchaseReturnsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findAll(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.service.findAll({
      page: parseInt(page, 10) || 1,
      pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASES_RETURN)
  create(@Body() dto: CreatePurchaseReturnDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }
}
