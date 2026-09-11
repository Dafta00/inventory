import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class UpsertSettingDto {
  @IsString() @IsNotEmpty() key: string;
  @IsDefined() value: unknown;
}
