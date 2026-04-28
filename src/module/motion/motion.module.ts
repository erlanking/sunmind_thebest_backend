import { Module } from '@nestjs/common';
import { MotionController } from './motion.controller';

@Module({
  imports: [],
  controllers: [MotionController],
  providers: [],
})
export class MotionModule {}
