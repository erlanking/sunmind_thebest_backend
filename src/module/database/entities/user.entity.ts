import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'google_id', type: 'varchar', nullable: true, unique: true })
  googleId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar?: string | null;

  @Column({ type: 'varchar', nullable: true })
  password?: string | null;

  @Column({
    name: 'emergency_alerts_enabled',
    type: 'boolean',
    default: true,
  })
  emergencyAlertsEnabled!: boolean;

  @Column({
    name: 'push_notifications_enabled',
    type: 'boolean',
    default: true,
  })
  pushNotificationsEnabled!: boolean;

  @Column({ name: 'fcm_token', type: 'varchar', nullable: true })
  fcmToken?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToMany(() => RoleEntity, (role) => role.users)
  roles!: RoleEntity[];
}
