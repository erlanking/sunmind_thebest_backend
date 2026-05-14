import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { DeviceEntity } from '../database/entities/device.entity';
import { DeviceTelemetryEntity } from '../database/entities/device-telemetry.entity';
import { ZoneEntity } from '../database/entities/zone.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(DeviceEntity)
    private readonly devices: Repository<DeviceEntity>,
    @InjectRepository(ZoneEntity)
    private readonly zones: Repository<ZoneEntity>,
    @InjectRepository(DeviceTelemetryEntity)
    private readonly telemetry: Repository<DeviceTelemetryEntity>,
  ) {}

  async getStats() {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [
      totalUsers,
      totalDevices,
      totalZones,
      onlineDevices,
      newUsersToday,
      unownedDevices,
      offlineOver24h,
      lowBatteryDevices,
    ] = await Promise.all([
      this.users.count(),
      this.devices.count(),
      this.zones.count(),
      this.devices
        .createQueryBuilder('d')
        .where('d.last_seen > :time', { time: twoMinutesAgo })
        .getCount(),
      this.users
        .createQueryBuilder('u')
        .where('u.created_at >= :today', { today: todayStart })
        .getCount(),
      this.devices.count({ where: { userId: IsNull(), lastSeen: Not(IsNull()) } }),
      this.devices
        .createQueryBuilder('d')
        .where('d.last_seen IS NOT NULL AND d.last_seen < :time', { time: oneDayAgo })
        .getCount(),
      this.devices
        .createQueryBuilder('d')
        .where('d.battery_percent IS NOT NULL AND d.battery_percent < 20')
        .getCount(),
    ]);

    return {
      totalUsers,
      totalDevices,
      totalZones,
      onlineDevices,
      newUsersToday,
      unownedDevices,
      offlineOver24h,
      lowBatteryDevices,
    };
  }

  async getUsers() {
    const [userRows, deviceCounts, zoneCounts] = await Promise.all([
      this.users.find({
        select: ['id', 'name', 'email', 'createdAt', 'googleId'],
        order: { createdAt: 'DESC' },
      }),
      this.devices
        .createQueryBuilder('d')
        .select('d.user_id', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('d.user_id IS NOT NULL')
        .groupBy('d.user_id')
        .getRawMany(),
      this.zones
        .createQueryBuilder('z')
        .select('z.user_id', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('z.user_id IS NOT NULL')
        .groupBy('z.user_id')
        .getRawMany(),
    ]);

    const deviceMap = Object.fromEntries(
      deviceCounts.map((r) => [r.userId, Number(r.count)]),
    );
    const zoneMap = Object.fromEntries(
      zoneCounts.map((r) => [r.userId, Number(r.count)]),
    );

    return userRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      authType: u.googleId ? 'Google' : 'Email',
      deviceCount: deviceMap[u.id] ?? 0,
      zoneCount: zoneMap[u.id] ?? 0,
    }));
  }

  async deleteUser(id: number) {
    await this.users.delete(id);
    return { success: true };
  }

  async getDevices() {
    const rows = await this.devices.find({
      relations: ['user', 'zone'],
      order: { createdAt: 'DESC' },
    });
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    return rows.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      name: d.name ?? null,
      ownerEmail: d.user?.email ?? null,
      zoneName: d.zone?.name ?? null,
      online: d.lastSeen
        ? new Date(d.lastSeen).getTime() > twoMinutesAgo
        : false,
      lastSeen: d.lastSeen ?? null,
      batteryPercent: d.batteryPercent ?? null,
      brightness: d.brightness ?? null,
      lux: d.lux != null ? Math.round(d.lux) : null,
      manualMode: d.manualMode,
      createdAt: d.createdAt,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      icon: d.icon ?? null,
    }));
  }

  async setDeviceLocation(deviceId: string, latitude: number, longitude: number) {
    await this.devices.update({ deviceId }, { latitude, longitude });
    return { success: true };
  }

  async setDeviceIcon(deviceId: string, icon: string) {
    await this.devices.update({ deviceId }, { icon });
    return { success: true };
  }

  async deleteDevice(deviceId: string) {
    await this.devices.delete({ deviceId });
    return { success: true };
  }

  async getAnalytics() {
    const [
      usersByDay,
      activeDevicesByDay,
      devicesByHour,
      mostActiveDevices,
      topUsers,
      lowBattery,
    ] = await Promise.all([
      // Регистрации пользователей по дням (30 дней)
      this.users.query(`
        SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date ORDER BY date
      `),

      // Активные устройства по дням (30 дней)
      this.telemetry.query(`
        SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
               COUNT(DISTINCT device_id)::int AS count
        FROM device_telemetry
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date ORDER BY date
      `),

      // Активность устройств по часам сегодня
      this.telemetry.query(`
        SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')::int AS hour,
               COUNT(DISTINCT device_id)::int AS count
        FROM device_telemetry
        WHERE created_at >= CURRENT_DATE
        GROUP BY hour ORDER BY hour
      `),

      // Самые активные устройства (7 дней)
      this.telemetry.query(`
        SELECT t.device_id AS "deviceId",
               d.name,
               COUNT(*)::int AS records
        FROM device_telemetry t
        LEFT JOIN devices d ON d.device_id = t.device_id
        WHERE t.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY t.device_id, d.name
        ORDER BY records DESC
        LIMIT 7
      `),

      // Топ пользователей по устройствам
      this.users.query(`
        SELECT u.id, u.name, u.email,
               COUNT(d.id)::int AS "deviceCount"
        FROM users u
        LEFT JOIN devices d ON d.user_id = u.id
        GROUP BY u.id, u.name, u.email
        ORDER BY "deviceCount" DESC
        LIMIT 7
      `),

      // Устройства с низким зарядом
      this.devices.query(`
        SELECT device_id AS "deviceId", name, battery_percent AS "batteryPercent"
        FROM devices
        WHERE battery_percent IS NOT NULL
        ORDER BY battery_percent ASC
        LIMIT 7
      `),
    ]);

    return {
      usersByDay,
      activeDevicesByDay,
      devicesByHour,
      mostActiveDevices,
      topUsers,
      lowBattery,
    };
  }

  async getUnownedDevices() {
    const rows = await this.devices.find({
      where: { userId: IsNull(), lastSeen: Not(IsNull()) },
      order: { lastSeen: 'DESC' },
    });
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    return rows.map((d) => ({
      deviceId: d.deviceId,
      lux: d.lux != null ? Math.round(d.lux) : null,
      brightness: d.brightness ?? null,
      batteryPercent: d.batteryPercent ?? null,
      online: new Date(d.lastSeen!).getTime() > twoMinutesAgo,
      lastSeen: d.lastSeen,
    }));
  }
}
