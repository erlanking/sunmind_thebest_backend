import {
  Controller,
  Get,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ChangeModeDto,
  ControlLedDto,
  FullStatusResponseDto,
} from './dto/create-led.dto';
import { LedService } from './led.service';

@Controller('led')
@UsePipes(new ValidationPipe({ transform: true }))
export class LedController {
  constructor(private readonly esp32Service: LedService) {}

  @Get('status')
  async getStatus() {
    return await this.esp32Service.getStatus();
  }

  @Get('sensor/status')
  async getSensorStatus() {
    return await this.esp32Service.getSensorStatus();
  }

  @Get('full-status')
  async getFullStatus(): Promise<FullStatusResponseDto> {
    const [status, sensorStatus] = await Promise.all([
      this.esp32Service.getStatus(),
      this.esp32Service.getSensorStatus(),
    ]);

    return {
      led: {
        state: status.led_state,
        status_text: status.led_state ? 'ВКЛ' : 'ВЫКЛ',
      },
      mode: {
        manual_mode: status.manual_mode,
        mode_text: status.manual_mode ? 'РУЧНОЙ' : 'АВТО',
      },
      sensor: {
        motion_active: sensorStatus.motion_active,
        status_text: sensorStatus.motion_active ? 'АКТИВЕН' : 'НЕ АКТИВЕН',
      },
      statistics: {
        toggle_count: status.toggle_count,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('toggle')
  async toggleLed() {
    return await this.esp32Service.toggleLed();
  }

  @Post('led')
  async controlLed(@Body() controlLedDto: ControlLedDto) {
    return await this.esp32Service.controlLed(controlLedDto.state);
  }

  @Post('mode')
  async changeMode(@Body() changeModeDto: ChangeModeDto) {
    return await this.esp32Service.changeMode(changeModeDto.mode);
  }

  @Post('led/on')
  async turnOnLed() {
    return await this.esp32Service.controlLed(true);
  }

  @Post('led/off')
  async turnOffLed() {
    return await this.esp32Service.controlLed(false);
  }

  @Post('mode/manual')
  async setManualMode() {
    return await this.esp32Service.changeMode('manual');
  }

  @Post('mode/auto')
  async setAutoMode() {
    return await this.esp32Service.changeMode('auto');
  }

  @Get('ping')
  async ping() {
    try {
      await this.esp32Service.getStatus();
      return {
        connected: true,
        message: 'ESP32 доступен',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        message: 'ESP32 недоступен',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }
}
