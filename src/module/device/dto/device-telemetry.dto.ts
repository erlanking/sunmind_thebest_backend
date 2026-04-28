import { DeviceDataDto } from './device-data.dto';

export class DeviceTelemetryResponseDto extends DeviceDataDto {
  deviceId!: string;
  lux!: number;
  motion!: boolean;
  brightness!: number;
  batteryVoltage?: number | null;
  batteryPercent?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  manualMode!: boolean;
  createdAt!: Date;
}

export interface AnalyticsSummaryDto {
  avgLux: number | null;
  minLux: number | null;
  maxLux: number | null;
  motionCount: number;
  lightOnMinutes: number;
  avgBrightness: number | null;
  batteryMin: number | null;
  batteryMax: number | null;
  energyWh: number;
  energyKwh: number;
  estimatedSavingsPercent: number | null;
  remainingEnergyWh: number | null;
  remainingHours: number | null;
}
