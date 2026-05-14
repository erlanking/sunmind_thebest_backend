import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeviceScheduleEntity } from './device-schedule.entity';
import { ZoneEntity } from './zone.entity';
import { UserEntity } from './user.entity';

@Index('idx_device_device_id', ['deviceId'], { unique: true })
@Entity('devices')
export class DeviceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'device_id', unique: true })
  deviceId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  @Column({ type: 'float', nullable: true })
  lux?: number;

  @Column({ type: 'boolean', default: false })
  motion!: boolean;

  @Column({ type: 'int', nullable: true })
  brightness?: number;

  @Column({ name: 'battery_voltage', type: 'float', nullable: true })
  batteryVoltage?: number;

  @Column({ name: 'battery_percent', type: 'int', nullable: true })
  batteryPercent?: number;

  @Column({ type: 'float', nullable: true })
  temperature?: number;

  @Column({ type: 'float', nullable: true })
  humidity?: number;

  @Column({ name: 'manual_mode', type: 'boolean', default: false })
  manualMode!: boolean;

  @Column({ name: 'last_seen', type: 'timestamptz', nullable: true })
  lastSeen?: Date;

  @Column({ type: 'float', nullable: true })
  latitude?: number | null;

  @Column({ type: 'float', nullable: true })
  longitude?: number | null;

  @Column({ name: 'night_guard_enabled', type: 'boolean', default: false })
  nightGuardEnabled!: boolean;

  @Column({ name: 'night_guard_start_hour', type: 'int', default: 22 })
  nightGuardStartHour!: number;

  @Column({ name: 'night_guard_start_minute', type: 'int', default: 0 })
  nightGuardStartMinute!: number;

  @Column({ name: 'night_guard_end_hour', type: 'int', default: 6 })
  nightGuardEndHour!: number;

  @Column({ name: 'night_guard_end_minute', type: 'int', default: 0 })
  nightGuardEndMinute!: number;

  @Column({ name: 'power_source', type: 'varchar', length: 10, default: 'battery' })
  powerSource!: string; // 'battery' | 'ac'

  @Column({ name: 'is_charging', type: 'boolean', default: false })
  isCharging!: boolean;

  @Column({ name: 'charge_mode', type: 'varchar', length: 10, default: 'manual' })
  chargeMode!: string; // 'manual' | 'auto'

  @Column({ name: 'low_battery_threshold', type: 'int', default: 20 })
  lowBatteryThreshold!: number; // switch to AC when below X%

  @Column({ name: 'full_charge_threshold', type: 'int', default: 90 })
  fullChargeThreshold!: number; // stop charging when above X%

  @Column({ name: 'auto_solar_charge', type: 'boolean', default: true })
  autoSolarCharge!: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon?: string | null;

  @Column({ name: 'last_maintenance_at', type: 'timestamptz', nullable: true })
  lastMaintenanceAt?: Date | null;

  @Column({ name: 'firmware_version', type: 'varchar', length: 50, nullable: true })
  firmwareVersion?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => DeviceScheduleEntity, (schedule) => schedule.device)
  schedule?: DeviceScheduleEntity;

  @Column({ name: 'zone_id', nullable: true })
  zoneId?: number | null;

  @ManyToOne(() => ZoneEntity, (zone) => zone.devices, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'zone_id' })
  zone?: ZoneEntity | null;

  @Column({ name: 'user_id', nullable: true })
  userId?: number | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;
}
