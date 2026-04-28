import { IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class DeviceRegisterDto {
  @ValidateIf((dto: DeviceRegisterDto) => !dto.qr)
  @IsString()
  @IsNotEmpty()
  @Matches(/^SMP-\w+/, { message: 'Некорректный deviceId' })
  deviceId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  zoneName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^SUNMIND:SMP-\w+/, { message: 'Некорректный qr' })
  qr?: string;
}
