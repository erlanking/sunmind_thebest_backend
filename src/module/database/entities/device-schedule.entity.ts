import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeviceEntity } from './device.entity';

@Entity('device_schedule')
export class DeviceScheduleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'on_hour', type: 'int' })
  onHour!: number;

  @Column({ name: 'on_minute', type: 'int' })
  onMinute!: number;

  @Column({ name: 'off_hour', type: 'int' })
  offHour!: number;

  @Column({ name: 'off_minute', type: 'int' })
  offMinute!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => DeviceEntity, (device) => device.schedule, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'device_id', referencedColumnName: 'deviceId' })
  device!: DeviceEntity;
}
