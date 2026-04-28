import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleEntity } from '../database/entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomLogger } from '@/helpers/logger/logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity])],
  controllers: [RoleController],
  providers: [RoleService, CustomLogger],
  exports: [RoleService, TypeOrmModule],
})
export class RoleModule {}
