import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DeviceEntity } from '../database/entities/device.entity';
import { DeviceScheduleEntity } from '../database/entities/device-schedule.entity';
import { DeviceTelemetryEntity } from '../database/entities/device-telemetry.entity';
import { DeviceErrorEntity } from '../database/entities/device-error.entity';
import { DeviceMaintenanceEntity } from '../database/entities/device-maintenance.entity';
import { DeviceDataDto } from './dto/device-data.dto';
import {
  DeviceScheduleDto,
  DeviceScheduleResponseDto,
  DeviceStatusResponseDto,
} from './dto/device-response.dto';
import {
  AnalyticsSummaryDto,
  DeviceTelemetryResponseDto,
} from './dto/device-telemetry.dto';
import { DeviceRegisterDto } from './dto/device-register.dto';
import { ZoneService } from '../zone/zone.service';
import { UserService } from '../user/user.service';
import { Inject, forwardRef } from '@nestjs/common';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceAlertService } from './device-alert.service';
import { PubLedService } from '../pubLed/pubLed.service';
import { PanelService } from '../panel/panel.service';

const PERIOD_MAP = {
  day: 1,
  week: 7,
  month: 30,
} as const;

@Injectable()
export class DeviceService {
  private readonly defaultPowerWatts = Number(process.env.DEVICE_POWER_WATTS || 5);
  private readonly batteryCapacityWh = Number(process.env.BATTERY_CAPACITY_WH || 168);

  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    @InjectRepository(DeviceScheduleEntity)
    private readonly scheduleRepository: Repository<DeviceScheduleEntity>,
    @InjectRepository(DeviceTelemetryEntity)
    private readonly telemetryRepository: Repository<DeviceTelemetryEntity>,
    @InjectRepository(DeviceErrorEntity)
    private readonly errorRepository: Repository<DeviceErrorEntity>,
    @InjectRepository(DeviceMaintenanceEntity)
    private readonly maintenanceRepository: Repository<DeviceMaintenanceEntity>,
    @Inject(forwardRef(() => ZoneService))
    private readonly zoneService: ZoneService,
    private readonly userService: UserService,
    private readonly alertService: DeviceAlertService,
    @Inject(forwardRef(() => PubLedService))
    private readonly pubLedService: PubLedService,
    @Inject(forwardRef(() => PanelService))
    private readonly panelService: PanelService,
  ) {}

  async registerDevice(
    dto: DeviceRegisterDto,
    userId: number,
  ): Promise<DeviceStatusResponseDto> {
    // QR: SUNMIND:SMP-0001
    const deviceIdFromQr = dto.qr?.startsWith('SUNMIND:')
      ? dto.qr.split(':')[1]
      : undefined;

    const deviceId = dto.deviceId || deviceIdFromQr;
    if (!deviceId) {
      throw new HttpException('deviceId не указан', HttpStatus.BAD_REQUEST);
    }

    const device = await this.deviceRepository.findOne({ where: { deviceId } });

    if (!device) {
      throw new HttpException(
        'Устройство ещё не подключилось к серверу. Убедитесь, что ESP включён и в сети.',
        HttpStatus.NOT_FOUND,
      );
    }

    // Уже привязано к другому пользователю
    if (device.userId && device.userId !== userId) {
      throw new HttpException('Устройство уже привязано к другому пользователю', HttpStatus.CONFLICT);
    }

    const normalizedDeviceName = this.normalizeOptionalName(dto.name);
    const zoneName = dto.zoneName?.trim();
    const zone = zoneName
      ? await this.zoneService.findOrCreate(zoneName, userId)
      : null;

    if (
      device.userId === userId &&
      device.zoneId === (zone?.id ?? null) &&
      device.name === normalizedDeviceName
    ) {
      return {
        status: 'success',
        deviceId: device.deviceId,
        name: device.name ?? null,
        zoneId: device.zoneId ?? null,
        zoneName: zone?.name ?? null,
      } as any;
    }

    device.name = normalizedDeviceName;
    device.zoneId = zone?.id ?? null;
    device.userId = userId;
    await this.deviceRepository.save(device);

    // Auto-create panels (LED1 + LED2) for this controller if not yet created
    this.panelService.ensurePanelsForDevice(device.deviceId, userId).catch(() => {});

    return {
      status: 'success',
      deviceId: device.deviceId,
      name: device.name ?? null,
      zoneId: device.zoneId ?? null,
      zoneName: zone?.name ?? null,
    } as any;
  }

  async listDevices(userId: number): Promise<DeviceEntity[]> {
    return this.deviceRepository.find({
      where: { userId },
      relations: ['zone'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateDevice(
    deviceId: string,
    userId: number,
    dto: UpdateDeviceDto,
  ): Promise<DeviceEntity> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId, true);

    if (dto.name !== undefined) {
      device.name = this.normalizeOptionalName(dto.name);
    }

    if (dto.zoneId !== undefined) {
      if (dto.zoneId === null) {
        device.zoneId = null;
      } else {
        const zone = await this.zoneService.getOne(dto.zoneId, userId);
        device.zoneId = zone.id;
      }
    }

    await this.deviceRepository.save(device);

    return this.getOwnedDeviceOrFail(deviceId, userId, true);
  }

  async removeFromUser(
    deviceId: string,
    userId: number,
  ): Promise<{ status: string; deviceId: string }> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);

    device.name = null;
    device.userId = null;
    device.zoneId = null;
    await this.deviceRepository.save(device);

    return {
      status: 'success',
      deviceId: device.deviceId,
    };
  }

  async saveTelemetry(dto: DeviceDataDto): Promise<DeviceStatusResponseDto> {
    const createdAt = dto.createdAt ? new Date(dto.createdAt) : new Date();

    let device = await this.deviceRepository.findOne({
      where: { deviceId: dto.deviceId },
      relations: ['schedule'],
    });

    if (!device) {
      device = this.deviceRepository.create({ deviceId: dto.deviceId });
    }

    const resolvedManualMode =
      dto.manualMode ??
      (dto.mode
          ? dto.mode === 'manual'
          : device.manualMode ?? false);

    device.lux = dto.lux;
    device.motion = dto.motion;
    device.brightness = dto.brightness;
    device.batteryVoltage = dto.batteryVoltage ?? undefined;
    device.batteryPercent = dto.batteryPercent ?? undefined;
    device.temperature = dto.temperature ?? undefined;
    device.humidity = dto.humidity ?? undefined;
    device.manualMode = resolvedManualMode;
    device.lastSeen = createdAt;
    if (dto.latitude != null && dto.longitude != null) {
      device.latitude = dto.latitude;
      device.longitude = dto.longitude;
    }

    await this.deviceRepository.save(device);

    // Auto-charge logic
    if (device.batteryPercent != null && (device.batteryMode ?? 'manual') === 'auto') {
      const startThr = device.chargeStartThreshold ?? 20;
      const stopThr = device.chargeStopThreshold ?? 90;
      if (device.batteryPercent <= startThr && !device.isCharging) {
        device.isCharging = true;
        device.powerSource = 'ac';
        await this.deviceRepository.save(device);
        if (device.userId) this.alertService.notifyAcSwitch(device).catch(() => {});
        this.pubLedService.setPowerSource('ac', device.deviceId).catch(() => {});
        this.pubLedService.setCharging(true, device.deviceId).catch(() => {});
      } else if (device.batteryPercent >= stopThr && device.isCharging) {
        device.isCharging = false;
        device.powerSource = 'battery';
        await this.deviceRepository.save(device);
        this.pubLedService.setPowerSource('battery', device.deviceId).catch(() => {});
        this.pubLedService.setCharging(false, device.deviceId).catch(() => {});
      }
    } else if (
      (device.batteryMode ?? 'manual') === 'manual' &&
      device.batteryPercent != null &&
      device.batteryPercent <= 20 &&
      (device.powerSource ?? 'battery') === 'battery'
    ) {
      // Fallback: critically low in manual mode — force AC
      device.powerSource = 'ac';
      await this.deviceRepository.save(device);
      if (device.userId) {
        this.alertService.notifyAcSwitch(device).catch(() => {});
      }
      this.pubLedService.setPowerSource('ac', device.deviceId).catch(() => {});
    }

    // Check alerts asynchronously (don't block response)
    this.alertService.checkAndAlert(device).catch(() => {});

    const telemetry = this.telemetryRepository.create({
      deviceId: dto.deviceId,
      lux: dto.lux,
      motion: dto.motion,
      brightness: dto.brightness,
      batteryVoltage: dto.batteryVoltage ?? undefined,
      batteryPercent: dto.batteryPercent ?? undefined,
      temperature: dto.temperature ?? undefined,
      humidity: dto.humidity ?? undefined,
      manualMode: resolvedManualMode,
      powerSource: device.powerSource ?? 'battery',
      createdAt,
    });
    await this.telemetryRepository.save(telemetry);

    return this.mapStatus(device);
  }

  async getStatus(
    deviceId: string,
    userId: number,
  ): Promise<DeviceStatusResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);
    return this.mapStatus(device);
  }

  async getSchedule(
    deviceId: string,
    userId: number,
  ): Promise<DeviceScheduleResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);

    const schedule = await this.scheduleRepository.findOne({
      where: { device: { deviceId: device.deviceId } },
      relations: ['device'],
    });

    if (!schedule) {
      throw new HttpException('Расписание не найдено', HttpStatus.NOT_FOUND);
    }

    return this.mapSchedule(device.deviceId, schedule);
  }

  async setSchedule(
    deviceId: string,
    userId: number,
    dto: DeviceScheduleDto,
  ): Promise<DeviceScheduleResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);

    let schedule = await this.scheduleRepository.findOne({
      where: { device: { deviceId: device.deviceId } },
      relations: ['device'],
    });

    if (!schedule) {
      schedule = this.scheduleRepository.create({ ...dto, device });
    } else {
      schedule.onHour = dto.onHour;
      schedule.onMinute = dto.onMinute;
      schedule.offHour = dto.offHour;
      schedule.offMinute = dto.offMinute;
    }

    const saved = await this.scheduleRepository.save(schedule);

    return this.mapSchedule(device.deviceId, saved);
  }

  async getTelemetry(
    deviceId: string,
    userId: number,
    period: keyof typeof PERIOD_MAP,
  ): Promise<DeviceTelemetryResponseDto[]> {
    await this.getOwnedDeviceOrFail(deviceId, userId);
    const { from, to } = this.resolvePeriod(period);

    const rows = await this.telemetryRepository.find({
      where: { deviceId, createdAt: Between(from, to) },
      order: { createdAt: 'ASC' },
    });

    return rows.map((row) => ({
      deviceId: row.deviceId,
      lux: row.lux ?? 0,
      motion: row.motion,
      brightness: row.brightness ?? 0,
      batteryVoltage: row.batteryVoltage ?? null,
      batteryPercent: row.batteryPercent ?? null,
      temperature: row.temperature ?? null,
      humidity: row.humidity ?? null,
      manualMode: row.manualMode,
      powerSource: row.powerSource ?? 'battery',
      createdAt: new Date(row.createdAt),
    }));
  }

  async getAnalytics(
    deviceId: string,
    userId: number,
    period: keyof typeof PERIOD_MAP,
  ): Promise<AnalyticsSummaryDto> {
    await this.getOwnedDeviceOrFail(deviceId, userId);
    const { from, to } = this.resolvePeriod(period);

    const rows = await this.telemetryRepository.find({
      where: { deviceId, createdAt: Between(from, to) },
      order: { createdAt: 'ASC' },
    });

    if (!rows.length) {
      return {
        avgLux: null,
        minLux: null,
        maxLux: null,
        motionCount: 0,
        lightOnMinutes: 0,
        avgBrightness: null,
        batteryMin: null,
        batteryMax: null,
        energyWh: 0,
        energyKwh: 0,
        estimatedSavingsPercent: null,
        remainingEnergyWh: null,
        remainingHours: null,
      };
    }

    let luxSum = 0;
    let luxCount = 0;
    let minLux: number | null = null;
    let maxLux: number | null = null;

    let brightnessSum = 0;
    let brightnessCount = 0;
    let lightOnMs = 0;

    let batteryMin: number | null = null;
    let batteryMax: number | null = null;
    let latestBatteryPercent: number | null = null;

    let motionCount = 0;
    let prevMotion = false;

    let energyWh = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nextRow = rows[i + 1];

      // Lux stats
      if (row.lux !== null && row.lux !== undefined) {
        luxSum += row.lux;
        luxCount += 1;
        minLux = minLux === null ? row.lux : Math.min(minLux, row.lux);
        maxLux = maxLux === null ? row.lux : Math.max(maxLux, row.lux);
      }

      // Brightness stats
      if (row.brightness !== null && row.brightness !== undefined) {
        brightnessSum += row.brightness;
        brightnessCount += 1;
      }

      // Battery stats
      if (row.batteryPercent !== null && row.batteryPercent !== undefined) {
        batteryMin = batteryMin === null ? row.batteryPercent : Math.min(batteryMin, row.batteryPercent);
        batteryMax = batteryMax === null ? row.batteryPercent : Math.max(batteryMax, row.batteryPercent);
        latestBatteryPercent = row.batteryPercent;
      }

      // Motion transitions
      if (!prevMotion && row.motion) {
        motionCount += 1;
      }
      prevMotion = row.motion;

      // Energy & light-on time between current and next row
      if (nextRow) {
        const deltaMs = nextRow.createdAt.getTime() - row.createdAt.getTime();
        if (deltaMs > 0) {
          const brightness = row.brightness ?? 0;
          const effectivePower = this.defaultPowerWatts * (brightness / 255);
          const deltaHours = deltaMs / (1000 * 60 * 60);
          energyWh += effectivePower * deltaHours;

          if (brightness > 0) {
            lightOnMs += deltaMs;
          }
        }
      }
    }

    const avgLux = luxCount ? luxSum / luxCount : null;
    const avgBrightness = brightnessCount ? brightnessSum / brightnessCount : null;
    const energyKwh = energyWh / 1000;
    const lightOnMinutes = Math.round(lightOnMs / 60000);

    const remainingEnergyWh = latestBatteryPercent !== null
      ? this.batteryCapacityWh * (latestBatteryPercent / 100)
      : null;
    const remainingHours = remainingEnergyWh !== null && this.defaultPowerWatts > 0
      ? remainingEnergyWh / this.defaultPowerWatts
      : null;

    const firstTs = rows[0].createdAt.getTime();
    const lastTs = rows[rows.length - 1].createdAt.getTime();
    const totalHours = (lastTs - firstTs) / (1000 * 60 * 60);
    const baselineEnergyWh = totalHours > 0 ? this.defaultPowerWatts * totalHours : 0;
    const estimatedSavingsPercent = baselineEnergyWh > 0
      ? ((baselineEnergyWh - energyWh) / baselineEnergyWh) * 100
      : null;

    return {
      avgLux,
      minLux,
      maxLux,
      motionCount,
      lightOnMinutes,
      avgBrightness,
      batteryMin,
      batteryMax,
      energyWh: Number(energyWh.toFixed(4)),
      energyKwh: Number(energyKwh.toFixed(6)),
      estimatedSavingsPercent: estimatedSavingsPercent !== null
        ? Number(estimatedSavingsPercent.toFixed(1))
        : null,
      remainingEnergyWh: remainingEnergyWh !== null ? Number(remainingEnergyWh.toFixed(1)) : null,
      remainingHours: remainingHours !== null ? Number(remainingHours.toFixed(2)) : null,
    };
  }

  private resolvePeriod(period: keyof typeof PERIOD_MAP) {
    if (!PERIOD_MAP[period]) {
      throw new HttpException('Некорректный период', HttpStatus.BAD_REQUEST);
    }
    const to = new Date();
    const days = PERIOD_MAP[period];
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  private async getOwnedDeviceOrFail(
    deviceId: string,
    userId: number,
    withZone = false,
  ): Promise<DeviceEntity> {
    const device = await this.deviceRepository.findOne({
      where: { deviceId, userId },
      relations: withZone ? ['zone'] : [],
    });

    if (!device) {
      throw new HttpException('Устройство не найдено', HttpStatus.NOT_FOUND);
    }

    return device;
  }

  async lookupDevice(deviceId: string): Promise<{ found: boolean; connected: boolean }> {
    const device = await this.deviceRepository.findOne({ where: { deviceId } });
    if (!device) return { found: false, connected: false };
    const connected = device.lastSeen
      ? Date.now() - new Date(device.lastSeen).getTime() < 2 * 60 * 1000
      : false;
    return { found: true, connected };
  }

  mapStatus(device: DeviceEntity): DeviceStatusResponseDto {
    const lastSeen = device.lastSeen ?? null;
    const connected = lastSeen
      ? Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000
      : false;

    return {
      id: device.id,
      deviceId: device.deviceId,
      name: device.name ?? null,
      zoneId: device.zoneId ?? null,
      zoneName: device.zone?.name ?? null,
      lux: device.lux,
      motion: device.motion,
      brightness: device.brightness,
      batteryVoltage: device.batteryVoltage,
      batteryPercent: device.batteryPercent,
      temperature: device.temperature ?? null,
      humidity: device.humidity ?? null,
      manualMode: device.manualMode,
      mode: device.manualMode ? 'manual' : 'auto',
      lastSeen: lastSeen ? lastSeen.toISOString() : null,
      connected,
      deviceStatus: this.alertService.computeStatus(device),
      nightGuardEnabled: device.nightGuardEnabled ?? false,
      nightGuardStartHour: device.nightGuardStartHour ?? 22,
      nightGuardStartMinute: device.nightGuardStartMinute ?? 0,
      nightGuardEndHour: device.nightGuardEndHour ?? 6,
      nightGuardEndMinute: device.nightGuardEndMinute ?? 0,
      lastMaintenanceAt: device.lastMaintenanceAt?.toISOString() ?? null,
      firmwareVersion: device.firmwareVersion ?? null,
      powerSource: device.powerSource ?? 'battery',
      isCharging: device.isCharging ?? false,
      batteryMode: device.batteryMode ?? 'manual',
      chargeStartThreshold: device.chargeStartThreshold ?? 20,
      chargeStopThreshold: device.chargeStopThreshold ?? 90,
    };
  }

  async setBatterySettings(
    deviceId: string,
    userId: number,
    batteryMode: 'manual' | 'auto',
    chargeStartThreshold: number,
    chargeStopThreshold: number,
  ): Promise<DeviceStatusResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);
    device.batteryMode = batteryMode;
    device.chargeStartThreshold = chargeStartThreshold;
    device.chargeStopThreshold = chargeStopThreshold;
    await this.deviceRepository.save(device);
    return this.mapStatus(device);
  }

  async setCharging(deviceId: string, userId: number, isCharging: boolean): Promise<DeviceStatusResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);
    device.isCharging = isCharging;
    await this.deviceRepository.save(device);
    return this.mapStatus(device);
  }

  async setPowerSource(deviceId: string, userId: number, powerSource: 'battery' | 'ac'): Promise<DeviceStatusResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);
    device.powerSource = powerSource;
    await this.deviceRepository.save(device);
    return this.mapStatus(device);
  }

  async getErrors(deviceId: string, userId: number): Promise<DeviceErrorEntity[]> {
    await this.getOwnedDeviceOrFail(deviceId, userId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.errorRepository.find({
      where: { deviceId, createdAt: Between(sevenDaysAgo, new Date()) },
      order: { createdAt: 'DESC' },
    });
  }

  async resolveError(errorId: number, deviceId: string, userId: number): Promise<DeviceErrorEntity> {
    await this.getOwnedDeviceOrFail(deviceId, userId);
    const error = await this.errorRepository.findOne({ where: { id: errorId, deviceId } });
    if (!error) {
      throw new HttpException('Ошибка не найдена', HttpStatus.NOT_FOUND);
    }
    error.status = 'resolved';
    error.resolvedAt = new Date();
    return this.errorRepository.save(error);
  }

  async recordMaintenance(
    deviceId: string,
    userId: number,
    notes?: string,
  ): Promise<DeviceMaintenanceEntity> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);

    const record = this.maintenanceRepository.create({
      deviceId,
      triggerType: 'manual',
      notes: notes ?? null,
      performedBy: userId,
    });
    await this.maintenanceRepository.save(record);

    device.lastMaintenanceAt = new Date();
    await this.deviceRepository.save(device);

    return record;
  }

  async getMaintenanceHistory(deviceId: string, userId: number): Promise<DeviceMaintenanceEntity[]> {
    await this.getOwnedDeviceOrFail(deviceId, userId);
    return this.maintenanceRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async deleteMaintenance(deviceId: string, userId: number, maintenanceId: number): Promise<void> {
    await this.getOwnedDeviceOrFail(deviceId, userId);
    await this.maintenanceRepository.delete({ id: maintenanceId, deviceId });
  }

  async toggleNightGuard(deviceId: string, userId: number, enabled: boolean): Promise<DeviceStatusResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);
    device.nightGuardEnabled = enabled;
    await this.deviceRepository.save(device);
    return this.mapStatus(device);
  }

  async setNightGuardSchedule(
    deviceId: string,
    userId: number,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
  ): Promise<DeviceStatusResponseDto> {
    const device = await this.getOwnedDeviceOrFail(deviceId, userId);
    device.nightGuardStartHour = startHour;
    device.nightGuardStartMinute = startMinute;
    device.nightGuardEndHour = endHour;
    device.nightGuardEndMinute = endMinute;
    device.nightGuardEnabled = true; // автоматически включаем при настройке
    await this.deviceRepository.save(device);
    return this.mapStatus(device);
  }

  private mapSchedule(
    deviceId: string,
    schedule: DeviceScheduleEntity,
  ): DeviceScheduleResponseDto {
    return {
      deviceId,
      onHour: schedule.onHour,
      onMinute: schedule.onMinute,
      offHour: schedule.offHour,
      offMinute: schedule.offMinute,
    };
  }

  private normalizeOptionalName(name?: string | null): string | null {
    const normalizedName = name?.trim();
    return normalizedName ? normalizedName : null;
  }
}
