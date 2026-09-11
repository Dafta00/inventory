import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { WarehouseStatus } from '@prisma/client';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined';

export class CreateWarehouseDto {
  @IsString() @MinLength(1) name: string;
  @IsString() @MinLength(1) code: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @EmptyToUndefined() @IsEmail() email?: string;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @EmptyToUndefined() @IsEmail() email?: string;
  @ApiPropertyOptional({ enum: WarehouseStatus })
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;
}
