import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { PubLedService } from '../pubLed/pubLed.service';
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
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { UseGuards, Req } from '@nestjs/common';
import { UpdateDeviceDto } from './dto/update-device.dto';

@ApiTags('Device')
@Controller('api')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly pubLedService: PubLedService,
  ) {}

  private getUserId(req: any): number {
    return req.user?.sub || req.user?.id;
  }

  @Post('device-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Прием телеметрии от устройства' })
  async handleTelemetry(
    @Body() dto: DeviceDataDto,
  ): Promise<DeviceStatusResponseDto> {
    return this.deviceService.saveTelemetry(dto);
  }

  @Get('devices/lookup/:deviceId')
  @ApiOperation({ summary: 'Проверить, подключалось ли устройство к серверу' })
  async lookup(@Param('deviceId') deviceId: string) {
    return this.deviceService.lookupDevice(deviceId);
  }

  @Post('devices/register')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Регистрация устройства по QR/ID и привязка к зоне' })
  async register(
    @Req() req,
    @Body() dto: DeviceRegisterDto,
  ): Promise<DeviceStatusResponseDto> {
    return this.deviceService.registerDevice(dto, this.getUserId(req));
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Список панелей пользователя' })
  async list(@Req() req) {
    const devices = await this.deviceService.listDevices(this.getUserId(req));
    return devices.map((device) => this.deviceService.mapStatus(device));
  }

  @Patch('devices/:deviceId')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Редактирование панели' })
  async update(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    const device = await this.deviceService.updateDevice(
      deviceId,
      this.getUserId(req),
      dto,
    );
    return this.deviceService.mapStatus(device);
  }

  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Удалить панель у пользователя без удаления из базы' })
  async remove(
    @Req() req,
    @Param('deviceId') deviceId: string,
  ) {
    return this.deviceService.removeFromUser(deviceId, this.getUserId(req));
  }

  @Post('devices/:deviceId/control')
  @UseGuards(JwtAuthGuard as any)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Управление устройством (свет, яркость, режим)' })
  async controlDevice(
    @Param('deviceId') deviceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    // Конвертируем state: true/false → "ON"/"OFF" для ESP32
    if ('state' in body || 'on' in body || 'ledState' in body || 'led_state' in body) {
      const raw = body['state'] ?? body['on'] ?? body['ledState'] ?? body['led_state'];
      const on = raw === true || raw === 'ON' || raw === 'on' || raw === 1;
      if (on) {
        await this.pubLedService.turnOn(deviceId);
      } else {
        await this.pubLedService.turnOff(deviceId);
      }
    } else if ('brightness' in body) {
      await this.pubLedService.setBrightness(Number(body['brightness']), deviceId);
    } else if ('manual_mode' in body || 'manualMode' in body || 'mode' in body) {
      const mode = (body['mode'] as string) ?? ((body['manual_mode'] ?? body['manualMode']) ? 'manual' : 'auto');
      await this.pubLedService.setMode(mode as 'manual' | 'auto', deviceId);
    }
    return { status: 'ok', deviceId };
  }

  @Get('devices/:deviceId/status')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Текущее состояние устройства' })
  async getStatus(
    @Req() req,
    @Param('deviceId') deviceId: string,
  ): Promise<DeviceStatusResponseDto> {
    return this.deviceService.getStatus(deviceId, this.getUserId(req));
  }

  @Get('devices/:deviceId/telemetry')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'История телеметрии устройства' })
  async getTelemetry(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
  ): Promise<DeviceTelemetryResponseDto[]> {
    return this.deviceService.getTelemetry(deviceId, this.getUserId(req), period);
  }

  @Get('devices/:deviceId/analytics')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Аналитика по устройству' })
  async getAnalytics(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
  ): Promise<AnalyticsSummaryDto> {
    return this.deviceService.getAnalytics(deviceId, this.getUserId(req), period);
  }

  @Get('devices/:deviceId/schedule')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Получить расписание устройства' })
  async getSchedule(
    @Req() req,
    @Param('deviceId') deviceId: string,
  ): Promise<DeviceScheduleResponseDto> {
    return this.deviceService.getSchedule(deviceId, this.getUserId(req));
  }

  @Post('devices/:deviceId/schedule')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Сохранить расписание устройства' })
  async setSchedule(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Body() dto: DeviceScheduleDto,
  ): Promise<DeviceScheduleResponseDto> {
    return this.deviceService.setSchedule(
      deviceId,
      this.getUserId(req),
      dto,
    );
  }

  @Get('devices/:deviceId/errors')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'История ошибок устройства (7 дней)' })
  async getErrors(@Req() req, @Param('deviceId') deviceId: string) {
    return this.deviceService.getErrors(deviceId, this.getUserId(req));
  }

  @Patch('devices/:deviceId/errors/:errorId/resolve')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Отметить ошибку как решённую' })
  async resolveError(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Param('errorId') errorId: string,
  ) {
    return this.deviceService.resolveError(Number(errorId), deviceId, this.getUserId(req));
  }

  @Get('devices/:deviceId/maintenance')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'История обслуживания устройства' })
  async getMaintenanceHistory(@Req() req, @Param('deviceId') deviceId: string) {
    return this.deviceService.getMaintenanceHistory(deviceId, this.getUserId(req));
  }

  @Post('devices/:deviceId/maintenance')
  @UseGuards(JwtAuthGuard as any)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Записать обслуживание устройства' })
  async recordMaintenance(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Body() body: { notes?: string },
  ) {
    return this.deviceService.recordMaintenance(
      deviceId,
      this.getUserId(req),
      body.notes,
    );
  }

  @Patch('devices/:deviceId/power-source')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Переключить источник питания: battery | ac' })
  async setPowerSource(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Body() body: { powerSource: 'battery' | 'ac' },
  ) {
    return this.deviceService.setPowerSource(
      deviceId,
      this.getUserId(req),
      body.powerSource,
    );
  }

  @Patch('devices/:deviceId/night-guard')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Включить/выключить ночной охранный режим' })
  async toggleNightGuard(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.deviceService.toggleNightGuard(
      deviceId,
      this.getUserId(req),
      body.enabled,
    );
  }

  @Patch('devices/:deviceId/night-guard-schedule')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Настроить время активности охранного режима' })
  async setNightGuardSchedule(
    @Req() req,
    @Param('deviceId') deviceId: string,
    @Body() body: { startHour: number; startMinute: number; endHour: number; endMinute: number },
  ) {
    return this.deviceService.setNightGuardSchedule(
      deviceId,
      this.getUserId(req),
      body.startHour,
      body.startMinute,
      body.endHour,
      body.endMinute,
    );
  }
}
