import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

export class ZoneDeviceIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(/^SMP-\w+/, {
    each: true,
    message: 'Каждый deviceId должен быть в формате SMP-...',
  })
  deviceIds!: string[];
}
