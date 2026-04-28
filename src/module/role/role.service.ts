import { Injectable } from '@nestjs/common';
import { RoleCreateDto } from './dto/role.dto';
import { RoleEntity } from '../database/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomLogger } from '@/helpers/logger/logger.service';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly logger: CustomLogger,
  ) {}

  async createRole(roleDto: RoleCreateDto, refId: string) {
    this.logger.debug(
      `[SERVICE] createRole: ${JSON.stringify(roleDto)}`,
      refId,
    );
    let error: any;
    try {
      this.logger.debug(`[SERVICE] createRole SUCCESS`, refId);
      const role = this.roleRepository.create({
        role_name: roleDto.role_name,
        description: roleDto.description,
      });
      return await this.roleRepository.save(role);
    } catch (err) {
      error = err;
    }
    this.logger.error(`[SERVICE] createRole FAILED`, refId);
    throw error;
  }
}
