import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataBaseModule } from './module/database/database.module';
import { LedModule } from './module/led/led.module';
import { CustomLogger } from './helpers/logger/logger.service';
import { MotionModule } from './module/motion/motion.module';
import { PubLedModule } from './module/pubLed/pubLed.module';
import { RoleModule } from './module/role/role.module';
import { UserModule } from './module/user/user.module';
import { AuthService } from './module/auth/auth.service';
import { AuthModule } from './module/auth/auth.module';
import { ReviewModule } from './module/review/review.module';
import { DeviceModule } from './module/device/device.module';
import { ZoneModule } from './module/zone/zone.module';
import { AdminModule } from './module/admin/admin.module';
import { PanelModule } from './module/panel/panel.module';
import { WeatherModule } from './module/weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DataBaseModule,
    LedModule,
    MotionModule,
    PubLedModule,
    RoleModule,
    UserModule,
    AuthModule,
    ReviewModule,
    DeviceModule,
    ZoneModule,
    AdminModule,
    PanelModule,
    WeatherModule,
  ],
  controllers: [AppController],
  providers: [AppService, CustomLogger],
})
export class AppModule {}
