import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpsertSettingDto } from './dto/setting.dto';

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  business_name: 'My Business',
  business_address: '',
  business_phone: '',
  business_email: '',
  currency: 'USD',
  tax_rate_default: 0,
  allow_negative_stock: false,
  low_stock_threshold_default: 10,
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getAll() {
    const rows = await this.prisma.setting.findMany();
    const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const row of rows) result[row.key] = row.value;
    return result;
  }

  async upsert(dto: UpsertSettingDto, userId: string) {
    const setting = await this.prisma.setting.upsert({
      where: { key: dto.key },
      create: { key: dto.key, value: dto.value as any },
      update: { value: dto.value as any },
    });
    await this.audit.log({
      userId,
      action: 'UPDATE_SETTING',
      entity: 'Setting',
      entityId: dto.key,
      description: `Updated setting "${dto.key}"`,
      newData: setting,
    });
    return setting;
  }
}
