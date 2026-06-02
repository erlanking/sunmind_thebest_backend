import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdatePanelDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsInt()
  zoneId?: number | null;
}

export class PanelControlDto {
  @IsOptional()
  @IsBoolean()
  state?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  brightness?: number;

  @IsOptional()
  @IsString()
  mode?: string;
}

export class AssignPanelsDto {
  @IsInt({ each: true })
  panelIds!: number[];
}
