import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PubLedService } from './pubLed.service';
import { PubLedController } from './pubLed.controller';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [
    forwardRef(() => DeviceModule),
    HttpModule,
    ClientsModule.register([
      {
        name: 'MQTT_SERVICE',
        transport: Transport.MQTT,
        options: {
          url: 'mqtt://broker.hivemq.com:1883', // адрес вашего брокера
        },
      },
    ]), // HttpModule - это МОДУЛЬ, его можно в imports
  ],
  controllers: [PubLedController],
  providers: [PubLedService], // Сервисы добавляем в providers
  exports: [PubLedService],
})
export class PubLedModule {}
