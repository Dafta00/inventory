import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined';

export class CreateExpenseDto {
  @IsString() @MinLength(1) category: string;
  @IsString() @MinLength(1) description: string;
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @EmptyToUndefined() @IsDateString() date?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @EmptyToUndefined() @IsDateString() date?: string;
  @IsOptional() @IsString() notes?: string;
}
