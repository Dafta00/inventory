import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined';

export class PurchaseOrderItemDto {
  @IsString() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitCost: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
}

export class CreatePurchaseOrderDto {
  @IsString() @MinLength(1) supplierId: string;
  @IsString() @MinLength(1) warehouseId: string;
  @IsOptional() @EmptyToUndefined() @IsDateString() expectedDate?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderStatusDto {
  @IsString() status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'CANCELLED';
}

export class ReceivePurchaseOrderItemDto {
  @IsString() productId: string;
  @Type(() => Number) @IsInt() @Min(0) quantityReceived: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items: ReceivePurchaseOrderItemDto[];

  @IsOptional() @IsString() notes?: string;
}
