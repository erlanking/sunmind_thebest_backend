import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceEntity } from '../database/entities/device.entity';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { PubLedModule } from '../pubLed/pubLed.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceEntity]),
    PubLedModule,
    NotificationModule,
    AuthModule,
  ],
  providers: [WeatherService],
  controllers: [WeatherController],
  exports: [WeatherService],
})
export class WeatherModule {}
