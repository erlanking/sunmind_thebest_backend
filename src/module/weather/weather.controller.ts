import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@Controller('api')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('devices/:deviceId/weather')
  @UseGuards(JwtAuthGuard as any)
  @ApiOperation({ summary: 'Прогноз погоды для устройства (облачность на сегодня и завтра)' })
  async getWeather(@Param('deviceId') deviceId: string) {
    return this.weatherService.getDeviceForecast(deviceId);
  }
}
