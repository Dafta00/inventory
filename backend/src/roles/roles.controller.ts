import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  listPermissions() {
    return this.service.listPermissions();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.id);
  }

  @Patch(':id/permissions')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  setPermissions(
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setPermissions(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }
}
