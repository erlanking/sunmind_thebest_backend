import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  role_name!: string;

  @Column()
  description!: string;

  @ManyToMany(() => UserEntity, (user) => user.roles)
  @JoinTable() // только с одной стороны!
  users!: UserEntity[];
}
