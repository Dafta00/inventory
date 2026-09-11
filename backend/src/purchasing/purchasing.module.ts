import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PurchaseReturnsService } from './purchase-returns.service';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [AuditModule, InventoryModule],
  providers: [PurchaseOrdersService, PurchasesService, PurchaseReturnsService],
  controllers: [PurchaseOrdersController, PurchasesController, PurchaseReturnsController],
  exports: [PurchaseOrdersService, PurchasesService, PurchaseReturnsService],
})
export class PurchasingModule {}
