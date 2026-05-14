import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class DeviceStatusResponseDto {
  id?: number;
  deviceId!: string;
  name?: string | null;
  zoneId?: number | null;
  zoneName?: string | null;
  lux?: number;
  motion!: boolean;
  brightness?: number;
  batteryVoltage?: number;
  batteryPercent?: number;
  temperature?: number | null;
  humidity?: number | null;
  manualMode!: boolean;
  mode!: 'manual' | 'auto' | 'schedule';
  lastSeen!: string | null;
  connected!: boolean;
  deviceStatus?: string;
  nightGuardEnabled?: boolean;
  nightGuardStartHour?: number;
  nightGuardStartMinute?: number;
  nightGuardEndHour?: number;
  nightGuardEndMinute?: number;
  lastMaintenanceAt?: string | null;
  firmwareVersion?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  icon?: string | null;
  powerSource?: string; // 'battery' | 'ac'
  isCharging?: boolean;
  chargeMode?: string; // 'manual' | 'auto'
  lowBatteryThreshold?: number;
  fullChargeThreshold?: number;
  autoSolarCharge?: boolean;
}

export class DeviceScheduleDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  onHour!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  onMinute!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  offHour!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  offMinute!: number;
}

export class DeviceScheduleResponseDto extends DeviceScheduleDto {
  deviceId!: string;
}
