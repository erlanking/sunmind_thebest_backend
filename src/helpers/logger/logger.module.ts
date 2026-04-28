import { Global, Module } from '@nestjs/common';
import { CustomLogger } from './logger.service';

@Global()
@Module({
  imports: [],
  providers: [CustomLogger],
  exports: [CustomLogger],
})
export class LoggerModule {}
