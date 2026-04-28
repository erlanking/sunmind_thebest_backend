import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LedState {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: false })
  led_state!: boolean;

  @Column({ nullable: true })
  device_id!: string;
}
