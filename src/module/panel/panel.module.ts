import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PanelEntity } from '../database/entities/panel.entity';
import { PanelService } from './panel.service';
import { PanelController } from './panel.controller';
import { PubLedModule } from '../pubLed/pubLed.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PanelEntity]),
    forwardRef(() => PubLedModule),
    AuthModule,
  ],
  providers: [PanelService],
  controllers: [PanelController],
  exports: [PanelService],
})
export class PanelModule {}
