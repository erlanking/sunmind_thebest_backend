import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { NotificationService } from './notification.service';
import { UserEntity } from '../database/entities/user.entity';
import { DeviceEntity } from '../database/entities/device.entity';
import { DeviceTelemetryEntity } from '../database/entities/device-telemetry.entity';
import { DeviceErrorEntity } from '../database/entities/device-error.entity';
import { DeviceMaintenanceEntity } from '../database/entities/device-maintenance.entity';
import { ZoneEntity } from '../database/entities/zone.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    TypeOrmModule.forFeature([
      UserEntity,
      DeviceEntity,
      ZoneEntity,
      DeviceTelemetryEntity,
      DeviceErrorEntity,
      DeviceMaintenanceEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'SECRET_KEY',
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, NotificationService],
  exports: [NotificationService],
})
export class AdminModule {}
