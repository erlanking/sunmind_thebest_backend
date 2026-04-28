// Обновите LedService для поддержки датчика движения
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LedState } from '../database/entities/led.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LedService {
  constructor(
    @InjectRepository(LedState) private ledRepository: Repository<LedState>,
    private readonly httpService: HttpService,
  ) {}

  // IP адрес вашего ESP32
  private esp32Ip: string | null = process.env.ESP32_IP || null;
  private readonly ESP32_PORT = parseInt(process.env.ESP32_PORT || '80', 10);
  private readonly ESP32_URL = `http://${this.esp32Ip}:${this.ESP32_PORT}`;

  // Получить статус системы
  async getStatus() {
    const response = await firstValueFrom(
      this.httpService.get(`${this.ESP32_URL}/status`),
    );
    return response.data;
  }

  // Получить статус датчика
  async getSensorStatus() {
    const response = await firstValueFrom(
      this.httpService.get(`${this.ESP32_URL}/sensor/status`),
    );
    return response.data;
  }

  // Переключить светодиод
  async toggleLed() {
    const response = await firstValueFrom(
      this.httpService.post(`${this.ESP32_URL}/toggle`),
    );
    return response.data;
  }

  // Управление светодиодом
  async controlLed(state: boolean) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.ESP32_URL}/led`, { state }),
    );
    return response.data;
  }

  // Сменить режим
  async changeMode(mode: 'manual' | 'auto') {
    const response = await firstValueFrom(
      this.httpService.post(`${this.ESP32_URL}/mode`, { mode }),
    );
    return response.data;
  }
}
