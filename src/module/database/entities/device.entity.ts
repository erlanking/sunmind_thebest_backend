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
