import { IsOptional, IsString } from 'class-validator';

export class ReportFiltersDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() format?: string;
}
