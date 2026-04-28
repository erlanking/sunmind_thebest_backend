import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ZoneControlDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  state?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  manualMode?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(255)
  brightness?: number;
}
