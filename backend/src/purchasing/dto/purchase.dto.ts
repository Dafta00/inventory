import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class QuickPurchaseItemDto {
  @IsString() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitCost: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
}

export class CreateQuickPurchaseDto {
  @IsString() @MinLength(1) supplierId: string;
  @IsString() @MinLength(1) warehouseId: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickPurchaseItemDto)
  items: QuickPurchaseItemDto[];
}
