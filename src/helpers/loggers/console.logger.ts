import { Injectable } from '@nestjs/common';
import chalk from 'chalk';
import moment from 'moment';

@Injectable()
export class Console {
  constructor() {}

  trace(message: any, refId?: string) {
    try {
      console.log(
        `${chalk.bold.whiteBright('[TRACE]')} ${chalk.bold.inverse(
          moment().format('DD.MM.YYYY HH:mm:ss'),
        )} ${chalk.cyan(message)} ${chalk.bold.underline(`RefID: ${refId}`)}`,
      );
      return true;
    } catch (error) {
      const err = error as Error;
      return { error: err.message, success: false };
    }
  }

  debug(message: string, refId: string) {
    try {
      console.log(
        `${chalk.bold.magenta('[DEBUG]')} ${chalk.bold.inverse(
          moment().format('DD.MM.YYYY HH:mm:ss'),
        )} ${chalk.cyan(message)} ${chalk.bold.underline(`RefID: ${refId}`)}`,
      );
    } catch (error) {
      const err = error as Error;
      return { error: err.message, success: false };
    }
  }

  info(message: string, refId: string) {
    try {
      console.log(
        `${chalk.bold.blue('[INFO]')} ${chalk.bold.inverse(
          moment().format('DD.MM.YYYY HH:mm:ss'),
        )} ${chalk.cyan(message)} ${chalk.bold.underline(`RefID: ${refId}`)}`,
      );
      return true;
    } catch (error) {
      const err = error as Error;
      return { error: err.message, success: false };
    }
  }

  warn(message: any, refId: string) {
    try {
      console.log(
        `${chalk.bold.yellow('[WARN]')} ${chalk.bold.inverse(
          moment().format('DD.MM.YYYY HH:mm:ss'),
        )} ${chalk.cyan(message)} ${chalk.bold.underline(`RefID: ${refId}`)}`,
      );
      return true;
    } catch (error) {
      const err = error as Error;
      return { error: err.message, success: false };
    }
  }

  error(message: any, refId: string) {
    try {
      console.log(
        `${chalk.bold.red('[ERROR]')} ${chalk.bold.inverse(
          moment().format('DD.MM.YYYY HH:mm:ss'),
        )} ${chalk.cyan(message)} ${chalk.bold.underline(`RefID: ${refId}`)}`,
      );
      return true;
    } catch (error) {
      const err = error as Error;
      return { error: err.message, success: false };
    }
  }
}
