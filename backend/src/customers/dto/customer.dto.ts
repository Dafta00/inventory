import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { CustomerType, PartyStatus } from '@prisma/client';
import { EmptyToUndefined } from '../../common/utils/empty-to-undefined';

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @EmptyToUndefined() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEnum(CustomerType) type?: CustomerType;
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @EmptyToUndefined() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ enum: CustomerType }) @IsOptional() @IsEnum(CustomerType) type?: CustomerType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional({ enum: PartyStatus }) @IsOptional() @IsEnum(PartyStatus) status?: PartyStatus;
}
