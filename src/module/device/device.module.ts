import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceEntity } from '../database/entities/device.entity';
import { DeviceScheduleEntity } from '../database/entities/device-schedule.entity';
import { DeviceTelemetryEntity } from '../database/entities/device-telemetry.entity';
import { DeviceErrorEntity } from '../database/entities/device-error.entity';
import { DeviceMaintenanceEntity } from '../database/entities/device-maintenance.entity';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { DeviceAlertService } from './device-alert.service';
import { ZoneModule } from '../zone/zone.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PubLedModule } from '../pubLed/pubLed.module';
import { NotificationModule } from '../notification/notification.module';
import { PanelModule } from '../panel/panel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceEntity,
      DeviceScheduleEntity,
      DeviceTelemetryEntity,
      DeviceErrorEntity,
      DeviceMaintenanceEntity,
    ]),
    forwardRef(() => ZoneModule),
    forwardRef(() => PubLedModule),
    forwardRef(() => PanelModule),
    NotificationModule,
    UserModule,
    AuthModule,
  ],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceAlertService],
  exports: [DeviceService, DeviceAlertService],
})
export class DeviceModule {}
