import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PubLedService, DeviceStatus } from './pubLed.service';

@Controller('light')
export class PubLedController {
  private readonly logger = new Logger(PubLedController.name);

  constructor(private readonly pubLedService: PubLedService) {}

  @Post('brightness')
  async changeBrightness(
    @Body() body: { value?: number; brightness?: number },
  ) {
    const val = body.value ?? body.brightness;
    if (val === undefined || val === null) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Brightness value is required',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.pubLedService.setBrightness(val);
  }
  @Get('status')
  async getStatus() {
    try {
      const status = this.pubLedService.getStatus();
      const connection = this.pubLedService.getConnectionStatus();

      return {
        status: 'success',
        device: status,
        connection,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка получения статуса:', error);
      throw new HttpException(
        {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('on')
  async turnOn() {
    try {
      await this.pubLedService.turnOn();
      return {
        status: 'success',
        message: 'Команда включения отправлена',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка включения света:', error);
      throw new HttpException(
        {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('off')
  async turnOff() {
    try {
      await this.pubLedService.turnOff();
      return {
        status: 'success',
        message: 'Команда выключения отправлена',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка выключения света:', error);
      throw new HttpException(
        {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('toggle')
  async toggle() {
    try {
      await this.pubLedService.toggle();
      return {
        status: 'success',
        message: 'Команда переключения отправлена',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка переключения света:', error);
      throw new HttpException(
        {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('mode')
  async setMode(@Body() body: { mode: 'manual' | 'auto' }) {
    try {
      if (!body.mode || !['manual', 'auto'].includes(body.mode)) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Неверный режим. Допустимые значения: manual, auto',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.pubLedService.setMode(body.mode);
      return {
        status: 'success',
        message: `Режим установлен: ${body.mode}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка смены режима:', error);
      throw new HttpException(
        {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('connection')
  async getConnection() {
    try {
      const status = this.pubLedService.getConnectionStatus();
      return {
        status: 'success',
        connection: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка получения статуса подключения:', error);
      throw new HttpException(
        {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
