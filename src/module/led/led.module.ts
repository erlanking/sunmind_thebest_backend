import { Module } from '@nestjs/common';
import { LedService } from './led.service';
import { LedController } from './led.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedState } from '../database/entities/led.entity';
import { CustomLogger } from '@/helpers/logger/logger.service';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedState]),
    HttpModule.register({ timeout: 50000, maxRedirects: 5 }),
  ],
  controllers: [LedController],
  providers: [LedService, CustomLogger],
  exports: [LedService],
})
export class LedModule {}
