import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEntity } from '../database/entities/device.entity';
import { DeviceErrorEntity } from '../database/entities/device-error.entity';
import { NotificationService } from '../admin/notification.service';

interface AlertState {
  lastBattery30Alert: number;
  lastBattery15Alert: number;
  lastErrorAlert: number;
  lastMotionGuardAlert: number;
  lastMaintenanceAlert: number;
  lastAcSwitchAlert: number;
}

// Error codes from ТЗ
const ERROR_CODES: Record<string, { code: string; description: string }> = {
  BATTERY_15: { code: 'E01', description: 'Критически низкий заряд батареи (<15%)' },
  BATTERY_30: { code: 'E02', description: 'Низкий заряд батареи (<30%)' },
  OFFLINE: { code: 'E03', description: 'Устройство не в сети (offline)' },
  TEMP_HIGH: { code: 'E04', description: 'Высокая температура (>60°C)' },
  MAINTENANCE: { code: 'E05', description: 'Требуется техническое обслуживание' },
  MOTION_GUARD: { code: 'E06', description: 'Обнаружено движение (охранный режим)' },
};

const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between same alerts

@Injectable()
export class DeviceAlertService {
  private readonly logger = new Logger(DeviceAlertService.name);
  private readonly alertStates = new Map<string, AlertState>();

  constructor(
    @InjectRepository(DeviceErrorEntity)
    private readonly errorRepository: Repository<DeviceErrorEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  async checkAndAlert(device: DeviceEntity): Promise<void> {
    const state = this.getAlertState(device.deviceId);
    const now = Date.now();
    const panelStatus = this.computeStatus(device);

    // Battery 15% - ERROR
    if (device.batteryPercent != null && device.batteryPercent <= 15) {
      if (now - state.lastBattery15Alert > ALERT_COOLDOWN_MS) {
        state.lastBattery15Alert = now;
        await this.recordError(device.deviceId, ERROR_CODES.BATTERY_15, panelStatus);
        if (device.userId) {
          await this.notificationService.sendToUser(
            device.userId,
            'Критический заряд батареи',
            `Устройство ${device.name || device.deviceId}: заряд ${device.batteryPercent}%. Требуется срочная замена.`,
          );
        }
      }
    }
    // Battery 30% - WARNING
    else if (device.batteryPercent != null && device.batteryPercent <= 30) {
      if (now - state.lastBattery30Alert > ALERT_COOLDOWN_MS) {
        state.lastBattery30Alert = now;
        await this.recordError(device.deviceId, ERROR_CODES.BATTERY_30, panelStatus);
        if (device.userId) {
          await this.notificationService.sendToUser(
            device.userId,
            'Низкий заряд батареи',
            `Устройство ${device.name || device.deviceId}: заряд ${device.batteryPercent}%. Зарядите батарею.`,
          );
        }
      }
    }

    // High temperature
    if (device.temperature != null && device.temperature > 60) {
      if (now - state.lastErrorAlert > ALERT_COOLDOWN_MS) {
        state.lastErrorAlert = now;
        await this.recordError(device.deviceId, ERROR_CODES.TEMP_HIGH, panelStatus);
        if (device.userId) {
          await this.notificationService.sendToUser(
            device.userId,
            'Высокая температура',
            `Устройство ${device.name || device.deviceId}: температура ${device.temperature}°C. Проверьте устройство.`,
          );
        }
      }
    }

    // Night guard mode: motion detected within the guard time window
    if (device.nightGuardEnabled && device.motion && this.isInNightGuardWindow(device)) {
      if (now - state.lastMotionGuardAlert > 5 * 60 * 1000) { // 5 min cooldown for motion
        state.lastMotionGuardAlert = now;
        await this.recordError(device.deviceId, ERROR_CODES.MOTION_GUARD, panelStatus);
        if (device.userId) {
          const startStr = `${String(device.nightGuardStartHour ?? 22).padStart(2, '0')}:${String(device.nightGuardStartMinute ?? 0).padStart(2, '0')}`;
          const endStr = `${String(device.nightGuardEndHour ?? 6).padStart(2, '0')}:${String(device.nightGuardEndMinute ?? 0).padStart(2, '0')}`;
          await this.notificationService.sendToUser(
            device.userId,
            'Обнаружено движение',
            `Устройство ${device.name || device.deviceId} зафиксировало движение в охранный период ${startStr}–${endStr}.`,
          );
        }
      }
    }

    // ERROR status alert
    if (panelStatus === 'ERROR' && now - state.lastErrorAlert > ALERT_COOLDOWN_MS) {
      state.lastErrorAlert = now;
    }

    // Maintenance: 30 days since last maintenance
    const lastMaint = device.lastMaintenanceAt
      ? new Date(device.lastMaintenanceAt).getTime()
      : null;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (
      (!lastMaint || now - lastMaint > thirtyDaysMs) &&
      now - state.lastMaintenanceAlert > thirtyDaysMs
    ) {
      state.lastMaintenanceAlert = now;
      await this.recordError(device.deviceId, ERROR_CODES.MAINTENANCE, panelStatus);
      if (device.userId) {
        await this.notificationService.sendToUser(
          device.userId,
          'Техническое обслуживание',
          `Устройство ${device.name || device.deviceId} требует обслуживания. Прошло более 30 дней.`,
        );
      }
    }

    this.alertStates.set(device.deviceId, state);
  }

  async checkOfflineDevices(): Promise<void> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const devices = await this.deviceRepository.find();

    for (const device of devices) {
      if (!device.userId) continue;
      if (!device.lastSeen || new Date(device.lastSeen) < twoMinutesAgo) {
        const state = this.getAlertState(device.deviceId);
        const now = Date.now();
        if (now - state.lastErrorAlert > ALERT_COOLDOWN_MS) {
          state.lastErrorAlert = now;
          await this.recordError(device.deviceId, ERROR_CODES.OFFLINE, 'ERROR');
          this.alertStates.set(device.deviceId, state);
        }
      }
    }
  }

  computeStatus(device: DeviceEntity): string {
    const lastSeen = device.lastSeen ?? null;
    const online = lastSeen
      ? Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000
      : false;

    if (!online || (device.batteryPercent != null && device.batteryPercent <= 15)) {
      return 'ERROR';
    }
    if (
      (device.batteryPercent != null && device.batteryPercent <= 30) ||
      (device.temperature != null && device.temperature > 60)
    ) {
      return 'WARNING';
    }
    return 'OK';
  }

  private async recordError(
    deviceId: string,
    errorDef: { code: string; description: string },
    panelStatus: string,
  ): Promise<void> {
    try {
      const error = this.errorRepository.create({
        deviceId,
        errorCode: errorDef.code,
        description: errorDef.description,
        panelStatus,
        status: 'active',
      });
      await this.errorRepository.save(error);
      this.logger.log(`Error recorded: ${errorDef.code} for device ${deviceId}`);
    } catch (err: any) {
      this.logger.error(`Failed to record error: ${err.message}`);
    }
  }

  private isInNightGuardWindow(device: DeviceEntity): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startH = device.nightGuardStartHour ?? 22;
    const startM = device.nightGuardStartMinute ?? 0;
    const endH = device.nightGuardEndHour ?? 6;
    const endM = device.nightGuardEndMinute ?? 0;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      // Crosses midnight e.g. 22:00 → 06:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  async notifyAcSwitch(device: DeviceEntity): Promise<void> {
    const state = this.getAlertState(device.deviceId);
    const now = Date.now();
    if (now - state.lastAcSwitchAlert < ALERT_COOLDOWN_MS) return;
    state.lastAcSwitchAlert = now;
    this.alertStates.set(device.deviceId, state);
    if (device.userId) {
      await this.notificationService.sendToUser(
        device.userId,
        'Переключение на питание от розетки',
        `Устройство ${device.name || device.deviceId}: заряд батареи ${device.batteryPercent}%. Питание автоматически переключено на розетку.`,
      );
    }
  }

  private getAlertState(deviceId: string): AlertState {
    if (!this.alertStates.has(deviceId)) {
      this.alertStates.set(deviceId, {
        lastBattery30Alert: 0,
        lastBattery15Alert: 0,
        lastErrorAlert: 0,
        lastMotionGuardAlert: 0,
        lastMaintenanceAlert: 0,
        lastAcSwitchAlert: 0,
      });
    }
    return this.alertStates.get(deviceId)!;
  }
}
