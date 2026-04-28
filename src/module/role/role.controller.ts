import { Body, Controller, Post } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleCreateDto } from './dto/role.dto';
import { CustomLogger } from '@/helpers/logger/logger.service';
import { RefId } from '../../decorators/ref.decorator';

@Controller('roles')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly logger: CustomLogger,
  ) {}

  @Post()
  createRole(@Body() roleDro: RoleCreateDto, @RefId() refId: string) {
    this.logger.debug(`[CREATE] role: ${roleDro} `, refId);
    try {
      this.logger.debug(`[CREATE] role: SUCCESS `, refId);
      return this.roleService.createRole(roleDro, refId);
    } catch (error) {
      this.logger.error(`[CREATE] role: FAILED `, refId);
      throw error;
    }
  }
}
