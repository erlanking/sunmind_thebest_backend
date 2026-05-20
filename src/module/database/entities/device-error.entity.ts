import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('device_errors')
export class DeviceErrorEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'device_id' })
  deviceId!: string;

  @Column({ name: 'error_code', type: 'varchar', length: 10 })
  errorCode!: string;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ name: 'panel_status', type: 'varchar', length: 20 })
  panelStatus!: string; // OK | WARNING | ERROR

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string; // active | resolved

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
