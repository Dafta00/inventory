import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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

export class SalesReturnItemDto {
  @IsString() productId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
  @IsEnum(ReturnReason) reason: ReturnReason;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsBoolean() restock?: boolean;
}

export class CreateSalesReturnDto {
  @IsString() @MinLength(1) saleId: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReturnItemDto)
  items: SalesReturnItemDto[];
}
