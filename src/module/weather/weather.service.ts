import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import axios from 'axios';
import { DeviceEntity } from '../database/entities/device.entity';
import { PubLedService } from '../pubLed/pubLed.service';
import { NotificationService } from '../admin/notification.service';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CLOUD_THRESHOLD = 70; // % облачности — порог для запуска зарядки

export interface WeatherForecast {
  today: { cloudcover: number; description: string };
  tomorrow: { cloudcover: number; description: string; willCharge: boolean };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
    private readonly pubLedService: PubLedService,
    private readonly notificationService: NotificationService,
  ) {}

  // Каждый день в 20:00 — проверяем погоду и заряжаем заранее
  @Cron('0 20 * * *')
  async checkWeatherAndPrepare(): Promise<void> {
    this.logger.log('Проверка погоды для всех устройств...');

    const devices = await this.deviceRepo.find({
      where: { latitude: Not(IsNull()), longitude: Not(IsNull()), userId: Not(IsNull()) },
    });

    this.logger.log(`Устройств с координатами: ${devices.length}`);

    for (const device of devices) {
      await this.processDevice(device);
    }
  }

  private async processDevice(device: DeviceEntity): Promise<void> {
    try {
      const forecast = await this.fetchForecast(device.latitude!, device.longitude!);
      const tomorrow = forecast.daily.cloudcover_mean[1] ?? 0;

      this.logger.log(
        `${device.deviceId}: облачность завтра ${tomorrow}% (порог ${CLOUD_THRESHOLD}%)`,
      );

      if (tomorrow >= CLOUD_THRESHOLD) {
        await this.pubLedService.setCharging(true, device.deviceId);

        if (device.userId) {
          await this.notificationService.sendToUser(
            device.userId,
            '☁️ Пасмурно завтра — зарядка запущена',
            `${device.name ?? device.deviceId}: заряжаемся заранее, завтра ожидается облачность ${tomorrow}%.`,
          );
        }

        this.logger.log(`${device.deviceId}: зарядка запущена`);
      }
    } catch (err: any) {
      this.logger.error(`${device.deviceId}: ${err.message}`);
    }
  }

  // Получить прогноз для конкретного устройства (для приложения)
  async getDeviceForecast(deviceId: string): Promise<WeatherForecast> {
    const device = await this.deviceRepo.findOne({ where: { deviceId } });

    if (!device || device.latitude == null || device.longitude == null) {
      throw new Error('Устройство не найдено или координаты не указаны');
    }

    const raw = await this.fetchForecast(device.latitude, device.longitude);
    const todayCloud: number = raw.daily.cloudcover_mean[0] ?? 0;
    const tomorrowCloud: number = raw.daily.cloudcover_mean[1] ?? 0;

    return {
      today: {
        cloudcover: todayCloud,
        description: this.cloudDescription(todayCloud),
      },
      tomorrow: {
        cloudcover: tomorrowCloud,
        description: this.cloudDescription(tomorrowCloud),
        willCharge: tomorrowCloud >= CLOUD_THRESHOLD,
      },
    };
  }

  private async fetchForecast(lat: number, lon: number): Promise<any> {
    const response = await axios.get(OPEN_METEO_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        daily: 'cloudcover_mean',
        timezone: 'auto',
        forecast_days: 2,
      },
      timeout: 10000,
    });
    return response.data;
  }

  private cloudDescription(cloudcover: number): string {
    if (cloudcover < 20) return 'Ясно';
    if (cloudcover < 50) return 'Малооблачно';
    if (cloudcover < 70) return 'Облачно';
    if (cloudcover < 90) return 'Пасмурно';
    return 'Очень пасмурно';
  }
}
