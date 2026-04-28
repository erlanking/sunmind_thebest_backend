import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZoneEntity } from '../database/entities/zone.entity';
import { DeviceEntity } from '../database/entities/device.entity';
import { AuthModule } from '../auth/auth.module';
import { ZoneService } from './zone.service';
import { ZoneController } from './zone.controller';
import { DeviceModule } from '../device/device.module';
import { PubLedModule } from '../pubLed/pubLed.module';

@Module({
  imports: [TypeOrmModule.forFeature([ZoneEntity, DeviceEntity]), AuthModule, forwardRef(() => DeviceModule), forwardRef(() => PubLedModule)],
  providers: [ZoneService],
  controllers: [ZoneController],
  exports: [ZoneService],
})
export class ZoneModule {}
