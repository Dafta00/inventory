import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesReturnsService } from './sales-returns.service';
import { SalesReturnsController } from './sales-returns.controller';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [AuditModule, InventoryModule],
  providers: [SalesService, SalesReturnsService],
  controllers: [SalesController, SalesReturnsController],
  exports: [SalesService, SalesReturnsService],
})
export class SalesModule {}
