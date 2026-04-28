import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ZoneEntity } from '../database/entities/zone.entity';
import { DeviceEntity } from '../database/entities/device.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneControlDto } from './dto/zone-control.dto';
import { PubLedService } from '../pubLed/pubLed.service';

@Injectable()
export class ZoneService {
  constructor(
    @InjectRepository(ZoneEntity)
    private readonly zoneRepository: Repository<ZoneEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    @Inject(forwardRef(() => PubLedService)) private readonly pubLedService: PubLedService,
  ) {}

  async findOrCreate(name: string, userId: number): Promise<ZoneEntity> {
    const normalizedName = name.trim();
    let zone = await this.zoneRepository.findOne({
      where: { name: normalizedName, userId },
    });
    if (!zone) {
      zone = this.zoneRepository.create({ name: normalizedName, userId });
      zone = await this.zoneRepository.save(zone);
    }
    return zone;
  }

  async create(dto: CreateZoneDto, userId: number): Promise<ZoneEntity> {
    const normalizedName = dto.name.trim();
    const exists = await this.zoneRepository.findOne({
      where: { name: normalizedName, userId },
    });
    if (exists) {
      throw new HttpException(
        'Зона с таким именем уже существует',
        HttpStatus.CONFLICT,
      );
    }

    const zone = await this.zoneRepository.save(
      this.zoneRepository.create({ name: normalizedName, userId }),
    );

    if (dto.deviceIds?.length) {
      await this.attachDevicesToZone(zone, userId, dto.deviceIds);
    }

    return this.getOne(zone.id, userId);
  }

  async list(userId: number): Promise<ZoneEntity[]> {
    const zones = await this.zoneRepository.find({ where: { userId } });

    if (!zones.length) {
      return zones;
    }

    const devices = await this.deviceRepository.find({
      where: {
        userId,
        zoneId: In(zones.map((zone) => zone.id)),
      },
    });

    const devicesByZoneId = new Map<number, DeviceEntity[]>();
    for (const device of devices) {
      if (!device.zoneId) {
        continue;
      }

      const zoneDevices = devicesByZoneId.get(device.zoneId) ?? [];
      zoneDevices.push(device);
      devicesByZoneId.set(device.zoneId, zoneDevices);
    }

    return zones.map((zone) => ({
      ...zone,
      devices: devicesByZoneId.get(zone.id) ?? [],
    }));
  }

  async getUngroupedDevices(userId: number): Promise<DeviceEntity[]> {
    return this.deviceRepository.find({
      where: {
        userId,
        zoneId: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });
  }

  async getOne(zoneId: number, userId: number): Promise<ZoneEntity> {
    const [zone, devices] = await Promise.all([
      this.getOwnedZoneOrFail(zoneId, userId),
      this.deviceRepository.find({
        where: {
          zoneId,
          userId,
        },
        order: { createdAt: 'ASC' },
      }),
    ]);

    return {
      ...zone,
      devices,
    };
  }

  async getDevices(zoneId: number, userId: number): Promise<DeviceEntity[]> {
    await this.getOwnedZoneOrFail(zoneId, userId);

    return this.deviceRepository.find({
      where: {
        zoneId,
        userId,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async assignDevices(
    zoneId: number,
    userId: number,
    deviceIds: string[],
  ): Promise<ZoneEntity> {
    const zone = await this.getOwnedZoneOrFail(zoneId, userId);
    await this.attachDevicesToZone(zone, userId, deviceIds);
    return this.getOne(zone.id, userId);
  }

  async update(
    zoneId: number,
    userId: number,
    dto: UpdateZoneDto,
  ): Promise<ZoneEntity> {
    const zone = await this.getOwnedZoneOrFail(zoneId, userId);

    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();
      if (!normalizedName) {
        throw new HttpException('Имя зоны обязательно', HttpStatus.BAD_REQUEST);
      }

      const existingZone = await this.zoneRepository.findOne({
        where: {
          name: normalizedName,
          userId,
        },
      });

      if (existingZone && existingZone.id !== zone.id) {
        throw new HttpException(
          'Зона с таким именем уже существует',
          HttpStatus.CONFLICT,
        );
      }

      zone.name = normalizedName;
      await this.zoneRepository.save(zone);
    }

    if (dto.deviceIds !== undefined) {
      await this.replaceZoneDevices(zone, userId, dto.deviceIds);
    }

    return this.getOne(zone.id, userId);
  }

  async delete(zoneId: number, userId: number): Promise<{ status: string }> {
    const zone = await this.getOwnedZoneOrFail(zoneId, userId);

    await this.deviceRepository.update(
      {
        zoneId: zone.id,
        userId,
      },
      {
        zoneId: null,
      },
    );

    await this.zoneRepository.delete(zone.id);

    return {
      status: 'success',
    };
  }

  async control(
    zoneId: number,
    userId: number,
    dto: ZoneControlDto,
  ): Promise<DeviceEntity[]> {
    if (
      dto.state === undefined &&
      dto.manualMode === undefined &&
      dto.brightness === undefined
    ) {
      throw new HttpException(
        'Не переданы параметры управления зоной',
        HttpStatus.BAD_REQUEST,
      );
    }

    const devices = await this.getDevices(zoneId, userId);

    if (!devices.length) {
      throw new HttpException(
        'Нельзя управлять пустой зоной',
        HttpStatus.BAD_REQUEST,
      );
    }

    const devicesToSave = devices.map((device) => {
      if (dto.manualMode !== undefined) {
        device.manualMode = dto.manualMode;
      }

      if (dto.state !== undefined) {
        if (dto.state) {
          device.brightness =
            dto.brightness ?? (device.brightness && device.brightness > 0
              ? device.brightness
              : 255);
          device.manualMode = dto.manualMode ?? true;
        } else {
          device.brightness = 0;
          device.manualMode = dto.manualMode ?? true;
        }
      } else if (dto.brightness !== undefined) {
        device.brightness = dto.brightness;
        device.manualMode = dto.manualMode ?? true;
      }

      return device;
    });

    await this.deviceRepository.save(devicesToSave);

    // Send MQTT commands to physical devices
    for (const device of devicesToSave) {
      try {
        if (dto.state !== undefined) {
          if (dto.state) {
            await this.pubLedService.turnOn(device.deviceId);
          } else {
            await this.pubLedService.turnOff(device.deviceId);
          }
        } else if (dto.brightness !== undefined) {
          await this.pubLedService.setBrightness(dto.brightness, device.deviceId);
        }
      } catch (_) {
        // Don't fail the whole request if MQTT is unavailable
      }
    }

    return this.getDevices(zoneId, userId);
  }

  async removeDevice(
    zoneId: number,
    userId: number,
    deviceId: string,
  ): Promise<ZoneEntity> {
    await this.getOwnedZoneOrFail(zoneId, userId);

    const normalizedDeviceId = deviceId.trim();
    const device = await this.deviceRepository.findOne({
      where: {
        deviceId: normalizedDeviceId,
        userId,
        zoneId,
      },
    });

    if (!device) {
      throw new HttpException(
        'Устройство в этой зоне не найдено',
        HttpStatus.NOT_FOUND,
      );
    }

    device.zoneId = null;
    await this.deviceRepository.save(device);

    return this.getOne(zoneId, userId);
  }

  private async getOwnedZoneOrFail(
    zoneId: number,
    userId: number,
  ): Promise<ZoneEntity> {
    const zone = await this.zoneRepository.findOne({
      where: { id: zoneId, userId },
    });

    if (!zone) {
      throw new HttpException('Зона не найдена', HttpStatus.NOT_FOUND);
    }

    return zone;
  }

  private async attachDevicesToZone(
    zone: ZoneEntity,
    userId: number,
    deviceIds: string[],
  ): Promise<void> {
    const normalizedDeviceIds = [...new Set(deviceIds.map((id) => id.trim()))];

    if (!normalizedDeviceIds.length) {
      return;
    }

    const existingDevices = await this.deviceRepository.find({
      where: {
        deviceId: In(normalizedDeviceIds),
      },
    });

    const existingById = new Map(
      existingDevices.map((device) => [device.deviceId, device]),
    );

    const devicesToSave = normalizedDeviceIds.map((deviceId) => {
      const device =
        existingById.get(deviceId) ?? this.deviceRepository.create({ deviceId });

      if (device.userId && device.userId !== userId) {
        throw new HttpException(
          `Устройство ${deviceId} уже привязано к другому пользователю`,
          HttpStatus.CONFLICT,
        );
      }

      device.userId = userId;
      device.zoneId = zone.id;
      return device;
    });

    await this.deviceRepository.save(devicesToSave);
  }

  private async replaceZoneDevices(
    zone: ZoneEntity,
    userId: number,
    deviceIds: string[],
  ): Promise<void> {
    const normalizedDeviceIds = [...new Set(deviceIds.map((id) => id.trim()))];

    const currentZoneDevices = await this.deviceRepository.find({
      where: {
        zoneId: zone.id,
        userId,
      },
    });

    const currentDeviceIds = new Set(
      currentZoneDevices.map((device) => device.deviceId),
    );
    const nextDeviceIds = new Set(normalizedDeviceIds);

    const devicesToDetach = currentZoneDevices.filter(
      (device) => !nextDeviceIds.has(device.deviceId),
    );

    if (devicesToDetach.length) {
      devicesToDetach.forEach((device) => {
        device.zoneId = null;
      });
      await this.deviceRepository.save(devicesToDetach);
    }

    const deviceIdsToAttach = normalizedDeviceIds.filter(
      (deviceId) => !currentDeviceIds.has(deviceId),
    );

    if (deviceIdsToAttach.length) {
      await this.attachDevicesToZone(zone, userId, deviceIdsToAttach);
    }
  }
}
