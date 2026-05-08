import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('idx_device_telemetry_device_created', ['deviceId', 'createdAt'])
@Entity('device_telemetry')
export class DeviceTelemetryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'device_id' })
  deviceId!: string;

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

  @Column({ name: 'power_source', type: 'varchar', nullable: true })
  powerSource?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
