import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('review')
export class ReviewEntity {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  author!: string;

  @Column({ type: 'varchar', length: 2000, nullable: false })
  text!: string;

  @Column({
    type: 'int',
    nullable: false,
    comment: 'Оценка от 1 до 5',
  })
  rating!: number;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    nullable: false,
  })
  createdAt!: Date;
}
