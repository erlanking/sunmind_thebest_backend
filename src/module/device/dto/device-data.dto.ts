import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class DeviceDataDto {
  @IsString()
  deviceId!: string;

  @IsNumber()
  @Type(() => Number)
  lux!: number;

  @IsBoolean()
  motion!: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(255)
  brightness?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  batteryVoltage?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  batteryPercent?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  temperature?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  humidity?: number | null;

  @IsOptional()
  @IsBoolean()
  manualMode?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['manual', 'auto', 'schedule'])
  mode?: 'manual' | 'auto' | 'schedule';

  @IsOptional()
  @Type(() => Date)
  createdAt?: Date;
}
