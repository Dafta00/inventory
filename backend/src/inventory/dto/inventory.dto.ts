import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ManualMovementType {
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  EXPIRY = 'EXPIRY',
  INITIAL_STOCK = 'INITIAL_STOCK',
}

export class AdjustStockDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsString() @IsNotEmpty() warehouseId: string;

  // Positive to increase stock, negative to decrease.
  @Type(() => Number)
  @IsInt()
  quantityDelta: number;

  @IsEnum(ManualMovementType)
  type: ManualMovementType;

  @IsOptional() @IsString() reason?: string;
}

export class TransferStockDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsString() @IsNotEmpty() fromWarehouseId: string;
  @IsString() @IsNotEmpty() toWarehouseId: string;

  @Type(() => Number)
  @IsInt()
  quantity: number;

  @IsOptional() @IsString() notes?: string;
}

export class MovementsQueryDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number = 20;
}
