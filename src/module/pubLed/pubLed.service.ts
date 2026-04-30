import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt from 'mqtt';
import { DeviceService } from '../device/device.service';

export interface DeviceStatus {
  led_state: string;
  manual_mode: boolean;
  motion_active: boolean;
  toggle_count: number;
  uptime: number;
  ip: string;
}

@Injectable()
export class PubLedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PubLedService.name);
  private client: mqtt.MqttClient;
  private readonly topics = {
    control: 'home/light/control',
    status: 'home/light/status',
    mode: 'home/light/mode',
    brightness: 'home/light/brightness',
  };
  private readonly telemetryTopic = 'sunmind/telemetry';

  private deviceStatus: DeviceStatus | null = null;
  private isConnecting = false;
  httpService: any;
  mqttClient: any;

  constructor(
    private configService: ConfigService,
    private readonly deviceService: DeviceService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || this.client?.connected) {
      return;
    }

    this.isConnecting = true;

    try {
      // Получаем конфигурацию
      const mqttUrl = this.configService.get<string>(
        'MQTT_URL',
        'mqtt://broker.hivemq.com',
      );

      const mqttPort = this.configService.get<number>('MQTT_PORT', 1883);

      this.logger.log(`Подключение к MQTT брокеру: ${mqttUrl}:${mqttPort}`);

      // Опции подключения
      const options: mqtt.IClientOptions = {
        clientId: `nest-${Date.now()}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        keepalive: 60,
        protocol: 'mqtt',
        ...(mqttUrl.startsWith('mqtts://')
          ? {
              rejectUnauthorized: false,
            }
          : {}),
      };

      // Подключаемся с URL и портом
      const connectUrl =
        mqttUrl.startsWith('mqtt://') || mqttUrl.startsWith('mqtts://')
          ? mqttUrl
          : `mqtt://${mqttUrl}:${mqttPort}`;

      this.client = mqtt.connect(connectUrl, options);

      this.setupEventListeners();

      // Ждем подключения с таймаутом
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout connecting to MQTT'));
        }, 10000);

        this.client.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(
        `Ошибка подключения к MQTT: ${(error as Error).message}`,
      );
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.logger.log('✅ Успешно подключено к MQTT брокеру');
      this.isConnecting = false;

      // Подписываемся на топики
      this.subscribeToTopics();
    });

    this.client.on('message', (topic: string, message: Buffer) => {
      this.handleMessage(topic, message);
    });

    this.client.on('error', (error: Error) => {
      this.logger.error('MQTT ошибка:', error.message);
      this.isConnecting = false;
    });

    this.client.on('offline', () => {
      this.logger.warn('MQTT отключено');
    });

    this.client.on('reconnect', () => {
      this.logger.log('Переподключение к MQTT...');
    });

    this.client.on('close', () => {
      this.logger.log('MQTT соединение закрыто');
    });
  }

  private subscribeToTopics(): void {
    // Подписываемся на все нужные топики + телеметрия
    const topics = [...Object.values(this.topics), this.telemetryTopic];

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Ошибка подписки на ${topic}:`, err.message);
        } else {
          this.logger.log(`📡 Подписался на ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const messageStr = message.toString();

      if (topic === this.telemetryTopic) {
        this.processTelemetry(messageStr);
        return;
      }

      if (topic === this.topics.status) {
        this.logger.debug(`Получен статус: ${messageStr}`);
        this.parseStatusMessage(messageStr);
      }
    } catch (err: any) {
      this.logger.error('Ошибка обработки сообщения:', err.message);
    }
  }

  private parseStatusMessage(message: string): void {
    try {
      // Пробуем парсить как JSON
      const data = JSON.parse(message) as DeviceStatus;
      this.deviceStatus = data;
      this.logger.debug(`✅ Статус устройства обновлен: ${data.led_state}`);
    } catch (jsonError) {
      // Если не JSON, пробуем парсить как простую строку
      this.parseSimpleStatus(message);
    }
  }

  private async processTelemetry(message: string) {
    try {
      const data = JSON.parse(message);
      await this.deviceService.saveTelemetry({
        deviceId: data.deviceId,
        motion: data.motion ?? false,
        brightness: data.brightness ?? 0,
        lux: data.lux ?? 0,
        batteryPercent: data.batteryPercent ?? null,
        manualMode: data.manualMode ?? false,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      } as any);
    } catch (error) {
      this.logger.error('Ошибка обработки telemetry', (error as Error).message);
    }
  }

  private parseSimpleStatus(message: string): void {
    message = message.trim().toUpperCase();

    const baseStatus: DeviceStatus = {
      led_state: 'UNKNOWN',
      manual_mode: true,
      motion_active: false,
      toggle_count: 0,
      uptime: 0,
      ip: '0.0.0.0',
    };

    if (message.includes('ON') || message === 'ON') {
      baseStatus.led_state = 'ON';
    } else if (message.includes('OFF') || message === 'OFF') {
      baseStatus.led_state = 'OFF';
    }

    const parts = message.split('_');
    for (const part of parts) {
      if (part === 'AUTO') baseStatus.manual_mode = false;
      if (part === 'MANUAL') baseStatus.manual_mode = true;
      if (part === 'MOTION') baseStatus.motion_active = true;
    }

    this.deviceStatus = baseStatus;
    this.logger.debug(`✅ Текстовый статус: ${message}`);
  }

  private disconnect(): void {
    if (this.client) {
      this.client.end(true, () => {
        this.logger.log('Отключено от MQTT');
      });
    }
  }

  // Проверяем подключение перед отправкой команды
  private async ensureConnected(): Promise<void> {
    if (!this.client || !this.client.connected) {
      this.logger.warn('MQTT не подключен, пытаемся переподключиться...');
      try {
        await this.connect();
      } catch (error) {
        throw new Error(`Не удалось подключиться к MQTT: ${(error as Error).message}`);
      }
    }
  }

  // Управление светом (с deviceId)
  async turnOn(deviceId?: string): Promise<void> {
    await this.ensureConnected();
    const topic = deviceId ? `home/${deviceId}/control` : this.topics.control;

    this.client.publish(topic, 'ON', { qos: 1 }, (error) => {
      if (error) {
        this.logger.error('Ошибка отправки команды ON:', error.message);
      } else {
        this.logger.log(`✅ ON → ${topic}`);
      }
    });
  }

  async turnOff(deviceId?: string): Promise<void> {
    await this.ensureConnected();
    const topic = deviceId ? `home/${deviceId}/control` : this.topics.control;

    this.client.publish(topic, 'OFF', { qos: 1 }, (error) => {
      if (error) {
        this.logger.error('Ошибка отправки команды OFF:', error.message);
      } else {
        this.logger.log(`✅ OFF → ${topic}`);
      }
    });
  }

  async setBrightness(value: number, deviceId?: string) {
    await this.ensureConnected();

    if (value === undefined || value === null) {
      this.logger.error('Попытка установить яркость без значения');
      throw new Error('Brightness value is required');
    }

    return new Promise((resolve, reject) => {
      const topic = deviceId ? `home/${deviceId}/brightness` : this.topics.brightness;
      const payload = String(Number(value));

      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`❌ Ошибка отправки MQTT: ${error.message}`);
          reject(new Error('MQTT publish failed'));
        } else {
          this.logger.log(`🌓 Яркость ${payload} → ${topic}`);
          resolve({ status: 'success', value: Number(value) });
        }
      });
    });
  }
  async toggle(): Promise<void> {
    await this.ensureConnected();

    if (!this.deviceStatus) {
      throw new Error('Статус устройства неизвестен');
    }

    const command = this.deviceStatus.led_state === 'ON' ? 'OFF' : 'ON';

    this.client.publish(this.topics.control, command, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error('Ошибка отправки команды toggle:', error.message);
      } else {
        this.logger.log(`✅ Команда отправлена: ${command}`);
      }
    });
  }

  // Управление режимом (с deviceId)
  async setMode(mode: 'manual' | 'auto', deviceId?: string): Promise<void> {
    await this.ensureConnected();
    const topic = deviceId ? `home/${deviceId}/mode` : this.topics.mode;

    this.client.publish(topic, mode, { qos: 1 }, (error: Error | undefined) => {
      if (error) {
        this.logger.error('Ошибка отправки режима:', error.message);
      } else {
        this.logger.log(`✅ Режим ${mode} → ${topic}`);
      }
    });
  }

  // Получение статуса
  getStatus(): DeviceStatus | null {
    return this.deviceStatus;
  }

  // Проверка подключения
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  // Получение статуса подключения
  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      isConnecting: this.isConnecting,
      clientId: this.client?.options?.clientId,
    };
  }

  // Управление конкретным устройством по deviceId
  async publishToDevice(
    _deviceId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.ensureConnected();
    const topic = this.topics.control;
    const message = JSON.stringify(payload);
    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos: 1 }, (error: Error | undefined) => {
        if (error) {
          this.logger.error(`❌ MQTT publish to ${topic} failed: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`✅ MQTT → ${topic}: ${message}`);
          resolve();
        }
      });
    });
  }

  // Установить mock статус для тестирования
  setMockStatus(ledState: 'ON' | 'OFF' = 'OFF'): void {
    this.deviceStatus = {
      led_state: ledState,
      manual_mode: true,
      motion_active: false,
      toggle_count: 0,
      uptime: Date.now() / 1000,
      ip: '127.0.0.1',
    };
    this.logger.log(`✅ Установлен mock статус: ${ledState}`);
  }
}
