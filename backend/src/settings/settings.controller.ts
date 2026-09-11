import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Put()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  upsert(@Body() dto: UpsertSettingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.upsert(dto, user.id);
  }
}
