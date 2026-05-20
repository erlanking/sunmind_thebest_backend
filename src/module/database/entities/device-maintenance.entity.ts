import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('device_maintenance')
export class DeviceMaintenanceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'device_id' })
  deviceId!: string;

  @Column({ name: 'trigger_type', type: 'varchar', length: 50, default: 'manual' })
  triggerType!: string; // manual | scheduled | data_driven

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes?: string | null;

  @Column({ name: 'performed_by', type: 'int', nullable: true })
  performedBy?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
