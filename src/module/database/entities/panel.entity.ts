import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ZoneEntity } from './zone.entity';
import { UserEntity } from './user.entity';

@Entity('panels')
export class PanelEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  @Column({ name: 'panel_index', type: 'int' })
  panelIndex!: number; // 0 = LED1 (control/brightness), 1 = LED2 (control2/brightness2)

  @Column({ name: 'device_id' })
  deviceId!: string;

  @Column({ name: 'zone_id', nullable: true })
  zoneId?: number | null;

  @ManyToOne(() => ZoneEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'zone_id' })
  zone?: ZoneEntity | null;

  @Column({ name: 'user_id', nullable: true })
  userId?: number | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @Column({ type: 'boolean', default: false })
  state!: boolean;

  @Column({ type: 'int', default: 0 })
  brightness!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
