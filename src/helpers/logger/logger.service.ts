import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    console.log(`[${context || 'LOG'}] ${message}`);
  }
  error(message: string, trace?: string, context?: string) {
    console.error(`[${context || 'ERROR'}] ${message}`, trace);
  }
  warn(message: string, context?: string) {
    console.warn(`[${context || 'WARN'}] ${message}`);
  }
  debug(message: string, context?: string) {
    console.debug(`[${context || 'DEBUG'}] ${message}`);
  }
  verbose(message: string, context?: string) {
    console.log(`[${context || 'VERBOSE'}] ${message}`);
  }
}
