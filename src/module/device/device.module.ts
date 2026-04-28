import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceEntity } from '../database/entities/device.entity';
import { DeviceScheduleEntity } from '../database/entities/device-schedule.entity';
import { DeviceTelemetryEntity } from '../database/entities/device-telemetry.entity';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { ZoneModule } from '../zone/zone.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PubLedModule } from '../pubLed/pubLed.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceEntity, DeviceScheduleEntity, DeviceTelemetryEntity]),
    forwardRef(() => ZoneModule),
    forwardRef(() => PubLedModule),
    UserModule,
    AuthModule,
  ],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
