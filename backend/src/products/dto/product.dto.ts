import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsOptional() @IsString() sku?: string; // auto-generated if omitted
  @IsOptional() @IsString() barcode?: string;

  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() primarySupplierId?: string;

  @Type(() => Number) @IsNumber() @Min(0) costPrice: number;
  @Type(() => Number) @IsNumber() @Min(0) sellingPrice: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;

  @IsOptional() @IsString() unit?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minStockLevel?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) reorderLevel?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxStockLevel?: number;

  @IsOptional() @IsString() imageUrl?: string;

  // Optional initial stock, applied via a proper INITIAL_STOCK movement after creation.
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) initialQuantity?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primarySupplierId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minStockLevel?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) reorderLevel?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxStockLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional({ enum: ProductStatus }) @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

export class ProductQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortDir?: 'asc' | 'desc';
  @IsOptional() @IsBoolean() @Type(() => Boolean) lowStockOnly?: boolean;
}

export class BulkArchiveDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids: string[];
}
