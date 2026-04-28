import {
  BadRequestException,
  Delete,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Req,
  Post,
  Body,
  Inject,
  forwardRef,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZoneService } from './zone.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { CreateZoneDto } from './dto/create-zone.dto';
import { DeviceService } from '../device/device.service';
import { ZoneDeviceIdsDto } from './dto/zone-device-ids.dto';
import { DeviceEntity } from '../database/entities/device.entity';
import { DeviceScheduleDto } from '../device/dto/device-response.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneControlDto } from './dto/zone-control.dto';

@ApiTags('Zones')
@Controller('api/zones')
@UseGuards(JwtAuthGuard as any)
export class ZoneController {
  constructor(
    private readonly zoneService: ZoneService,
    @Inject(forwardRef(() => DeviceService))
    private readonly deviceService: DeviceService,
  ) {}

  private getUserId(req: any): number {
    return req.user?.sub || req.user?.id;
  }

  private toZoneResponse(zone: {
    id: number;
    name: string;
    devices?: DeviceEntity[];
  }) {
    const devices = zone.devices ?? [];
    const brightnessValues = devices
      .map((device) => device.brightness)
      .filter((value): value is number => value !== undefined && value !== null);
    const onlineCutoff = Date.now() - 5 * 60 * 1000;

    return {
      id: zone.id,
      name: zone.name,
      deviceCount: devices.length,
      summary: {
        onlineDevices: devices.filter(
          (device) =>
            device.lastSeen && device.lastSeen.getTime() >= onlineCutoff,
        ).length,
        activeMotionDevices: devices.filter((device) => device.motion).length,
        averageBrightness: brightnessValues.length
          ? Math.round(
              brightnessValues.reduce((sum, value) => sum + value, 0) /
                brightnessValues.length,
            )
          : null,
      },
      devices: devices.map((device) => ({
        deviceId: device.deviceId,
        status: this.deviceService.mapStatus(device),
      })),
    };
  }

  @Get()
  async list(@Req() req) {
    const zones = await this.zoneService.list(this.getUserId(req));
    return zones.map((zone) => this.toZoneResponse(zone));
  }

  @Get('overview')
  async overview(@Req() req) {
    const userId = this.getUserId(req);
    const [zones, ungroupedDevices] = await Promise.all([
      this.zoneService.list(userId),
      this.zoneService.getUngroupedDevices(userId),
    ]);

    return {
      zones: zones.map((zone) => this.toZoneResponse(zone)),
      ungroupedDevices: ungroupedDevices.map((device) => ({
        deviceId: device.deviceId,
        status: this.deviceService.mapStatus(device),
      })),
    };
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Req() req, @Body() dto: CreateZoneDto) {
    const zone = await this.zoneService.create(dto, this.getUserId(req));
    return this.toZoneResponse(zone);
  }

  @Get(':id')
  async getOne(@Req() req, @Param('id') id: string) {
    const zone = await this.zoneService.getOne(Number(id), this.getUserId(req));
    return this.toZoneResponse(zone);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
  ) {
    const zone = await this.zoneService.update(
      Number(id),
      this.getUserId(req),
      dto,
    );
    return this.toZoneResponse(zone);
  }

  @Get(':id/devices')
  async devices(@Req() req, @Param('id') id: string) {
    return this.zoneService.getDevices(Number(id), this.getUserId(req));
  }

  @Post(':id/devices')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async addDevices(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: ZoneDeviceIdsDto,
  ) {
    const zone = await this.zoneService.assignDevices(
      Number(id),
      this.getUserId(req),
      dto.deviceIds,
    );
    return this.toZoneResponse(zone);
  }

  @Delete(':id/devices/:deviceId')
  async removeDevice(
    @Req() req,
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ) {
    const zone = await this.zoneService.removeDevice(
      Number(id),
      this.getUserId(req),
      deviceId,
    );
    return this.toZoneResponse(zone);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.zoneService.delete(Number(id), this.getUserId(req));
  }

  @Post(':id/control')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async control(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: ZoneControlDto,
  ) {
    const devices = await this.zoneService.control(
      Number(id),
      this.getUserId(req),
      dto,
    );

    return {
      zoneId: Number(id),
      updatedDevices: devices.length,
      devices: devices.map((device) => ({
        deviceId: device.deviceId,
        status: this.deviceService.mapStatus(device),
      })),
    };
  }

  @Post(':id/schedule')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async setZoneSchedule(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: DeviceScheduleDto,
  ) {
    const userId = this.getUserId(req);
    const devices = await this.zoneService.getDevices(Number(id), userId);

    if (!devices.length) {
      throw new BadRequestException(
        'Нельзя применить расписание к пустой зоне',
      );
    }

    const schedules = await Promise.all(
      devices.map((device) =>
        this.deviceService.setSchedule(device.deviceId, userId, dto),
      ),
    );

    return {
      zoneId: Number(id),
      updatedDevices: schedules.length,
      schedule: dto,
      devices: schedules,
    };
  }
}
