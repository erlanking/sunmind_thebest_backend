import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PanelEntity } from '../database/entities/panel.entity';
import { PubLedService } from '../pubLed/pubLed.service';
import { AssignPanelsDto, PanelControlDto, UpdatePanelDto } from './dto/panel.dto';

@Injectable()
export class PanelService {
  constructor(
    @InjectRepository(PanelEntity)
    private readonly panelRepository: Repository<PanelEntity>,
    @Inject(forwardRef(() => PubLedService))
    private readonly pubLedService: PubLedService,
  ) {}

  async ensurePanelsForDevice(deviceId: string, userId: number): Promise<PanelEntity[]> {
    const existing = await this.panelRepository.find({
      where: { deviceId },
      order: { panelIndex: 'ASC' },
    });

    const existingIndices = new Set(existing.map((p) => p.panelIndex));
    const toCreate: PanelEntity[] = [];

    for (const idx of [0, 1]) {
      if (!existingIndices.has(idx)) {
        toCreate.push(
          this.panelRepository.create({
            deviceId,
            panelIndex: idx,
            name: idx === 0 ? 'Панель 1' : 'Панель 2',
            userId,
            state: false,
            brightness: 0,
          }),
        );
      }
    }

    if (toCreate.length) {
      await this.panelRepository.save(toCreate);
    }

    // Sync userId on existing panels if not yet set
    const needsUser = existing.filter((p) => !p.userId);
    if (needsUser.length) {
      needsUser.forEach((p) => (p.userId = userId));
      await this.panelRepository.save(needsUser);
    }

    return this.panelRepository.find({
      where: { deviceId },
      order: { panelIndex: 'ASC' },
    });
  }

  async getPanelsForDevice(deviceId: string, userId: number): Promise<PanelEntity[]> {
    return this.panelRepository.find({
      where: { deviceId, userId },
      order: { panelIndex: 'ASC' },
    });
  }

  async update(panelId: number, userId: number, dto: UpdatePanelDto): Promise<PanelEntity> {
    const panel = await this.getOwnedOrFail(panelId, userId);

    if (dto.name !== undefined) {
      panel.name = dto.name?.trim() || null;
    }
    if (dto.zoneId !== undefined) {
      panel.zoneId = dto.zoneId;
    }

    return this.panelRepository.save(panel);
  }

  async control(panelId: number, userId: number, dto: PanelControlDto): Promise<PanelEntity> {
    const panel = await this.getOwnedOrFail(panelId, userId);

    if (dto.state !== undefined) panel.state = dto.state;
    if (dto.brightness !== undefined) panel.brightness = dto.brightness;

    await this.panelRepository.save(panel);

    try {
      await this.pubLedService.controlPanel(
        panel.deviceId,
        panel.panelIndex,
        dto.state,
        dto.brightness,
        dto.mode,
      );
    } catch (_) {}

    return panel;
  }

  async getPanelsInZone(zoneId: number, userId: number): Promise<PanelEntity[]> {
    return this.panelRepository.find({
      where: { zoneId, userId },
      order: { deviceId: 'ASC', panelIndex: 'ASC' },
    });
  }

  async assignPanelsToZone(zoneId: number, userId: number, dto: AssignPanelsDto): Promise<PanelEntity[]> {
    const panels = await this.panelRepository.find({
      where: { id: In(dto.panelIds), userId },
    });

    if (panels.length !== dto.panelIds.length) {
      throw new HttpException('Некоторые панели не найдены', HttpStatus.NOT_FOUND);
    }

    panels.forEach((p) => (p.zoneId = zoneId));
    await this.panelRepository.save(panels);
    return panels;
  }

  async removePanelFromZone(zoneId: number, userId: number, panelId: number): Promise<void> {
    const panel = await this.panelRepository.findOne({ where: { id: panelId, userId, zoneId } });
    if (!panel) {
      throw new HttpException('Панель не найдена в этой зоне', HttpStatus.NOT_FOUND);
    }
    panel.zoneId = null;
    await this.panelRepository.save(panel);
  }

  async controlZonePanels(zoneId: number, userId: number, dto: PanelControlDto): Promise<PanelEntity[]> {
    if (dto.state === undefined && dto.brightness === undefined) {
      throw new HttpException('Не переданы параметры управления', HttpStatus.BAD_REQUEST);
    }

    const panels = await this.getPanelsInZone(zoneId, userId);

    if (!panels.length) {
      throw new HttpException('Нет панелей в зоне', HttpStatus.BAD_REQUEST);
    }

    for (const panel of panels) {
      if (dto.state !== undefined) panel.state = dto.state;
      if (dto.brightness !== undefined) panel.brightness = dto.brightness;

      try {
        await this.pubLedService.controlPanel(
          panel.deviceId,
          panel.panelIndex,
          dto.state,
          dto.brightness,
        );
      } catch (_) {}
    }

    await this.panelRepository.save(panels);
    return panels;
  }

  private async getOwnedOrFail(panelId: number, userId: number): Promise<PanelEntity> {
    const panel = await this.panelRepository.findOne({ where: { id: panelId, userId } });
    if (!panel) {
      throw new HttpException('Панель не найдена', HttpStatus.NOT_FOUND);
    }
    return panel;
  }
}
