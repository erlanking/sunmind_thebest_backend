import { Controller, Post, Body, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

interface MotionData {
  deviceId: string;
  motionActive: boolean;
  ledState: boolean;
  manualMode: boolean;
  timestamp: number;
  motionPinState: number;
  wifiConnected: boolean;
  rssi?: number;
  receivedAt?: string;
  serverTime?: number;
}

let latestMotionData: MotionData | null = null;
const sseSubject = new Subject<MessageEvent>();

@Controller('api/motion')
export class MotionController {
  @Post('update')
  updateMotionData(@Body() data: MotionData) {
    // Улучшаем данные
    const enhancedData: MotionData = {
      ...data,
      receivedAt: new Date().toISOString(),
      serverTime: Date.now(),
    };

    latestMotionData = enhancedData;

    // Отправляем уведомление всем SSE клиентам
    sseSubject.next({
      data: JSON.stringify(enhancedData),
    } as MessageEvent);

    console.log(
      `📱 Обновление от ESP32: движение ${data.motionActive ? 'активно' : 'не активно'}`,
    );

    return {
      status: 'success',
      received: true,
      motionActive: data.motionActive,
      timestamp: Date.now(),
    };
  }

  @Get('latest')
  getLatestMotionData() {
    return (
      latestMotionData || {
        message: 'Нет данных от устройства',
        deviceId: 'unknown',
        motionActive: false,
        ledState: false,
        timestamp: Date.now(),
      }
    );
  }

  @Sse('stream')
  sse(): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      // Отправляем текущее состояние при подключении
      if (latestMotionData) {
        subscriber.next({
          data: JSON.stringify(latestMotionData),
        } as MessageEvent);
      }

      // Подписываемся на обновления
      const subscription = sseSubject.subscribe({
        next: (event) => subscriber.next(event),
        error: (err) => subscriber.error(err),
      });

      // Очистка при отключении
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  @Get('history')
  getMotionHistory() {
    // Здесь можно добавить логику для хранения истории
    return {
      current: latestMotionData,
      status: 'ok',
      connected: latestMotionData !== null,
    };
  }
}
