import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { PanelService } from './panel.service';
import { AssignPanelsDto, PanelControlDto, UpdatePanelDto } from './dto/panel.dto';

@ApiTags('Panels')
@Controller('api/panels')
@UseGuards(JwtAuthGuard as any)
export class PanelController {
  constructor(private readonly panelService: PanelService) {}

  private getUserId(req: any): number {
    return req.user?.sub || req.user?.id;
  }

  @Get('device/:deviceId')
  async listByDevice(@Req() req, @Param('deviceId') deviceId: string) {
    return this.panelService.getPanelsForDevice(deviceId, this.getUserId(req));
  }

  @Post('device/:deviceId/ensure')
  async ensureForDevice(@Req() req, @Param('deviceId') deviceId: string) {
    return this.panelService.ensurePanelsForDevice(deviceId, this.getUserId(req));
  }

  @Patch(':panelId')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Req() req,
    @Param('panelId') panelId: string,
    @Body() dto: UpdatePanelDto,
  ) {
    return this.panelService.update(Number(panelId), this.getUserId(req), dto);
  }

  @Post(':panelId/control')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async control(
    @Req() req,
    @Param('panelId') panelId: string,
    @Body() dto: PanelControlDto,
  ) {
    return this.panelService.control(Number(panelId), this.getUserId(req), dto);
  }

  @Get('zone/:zoneId')
  async listByZone(@Req() req, @Param('zoneId') zoneId: string) {
    return this.panelService.getPanelsInZone(Number(zoneId), this.getUserId(req));
  }

  @Post('zone/:zoneId/assign')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async assignToZone(
    @Req() req,
    @Param('zoneId') zoneId: string,
    @Body() dto: AssignPanelsDto,
  ) {
    return this.panelService.assignPanelsToZone(Number(zoneId), this.getUserId(req), dto);
  }

  @Post('zone/:zoneId/control')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async controlZone(
    @Req() req,
    @Param('zoneId') zoneId: string,
    @Body() dto: PanelControlDto,
  ) {
    return this.panelService.controlZonePanels(Number(zoneId), this.getUserId(req), dto);
  }
}
