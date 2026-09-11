import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/inventory')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  getInventory(@Param('id') id: string) {
    return this.service.getInventory(id);
  }

  @Get(':id/valuation')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  getValuation(@Param('id') id: string) {
    return this.service.getValuation(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.WAREHOUSES_MANAGE)
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WAREHOUSES_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.WAREHOUSES_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }
}
