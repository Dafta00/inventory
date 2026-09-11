import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ReturnReason } from '@prisma/client';

export class PurchaseReturnItemDto {
  @IsString() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitCost: number;
  @IsEnum(ReturnReason) reason: ReturnReason;
  @IsOptional() @IsString() condition?: string;
}

export class CreatePurchaseReturnDto {
  @IsString() @MinLength(1) purchaseId: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnItemDto)
  items: PurchaseReturnItemDto[];
}
