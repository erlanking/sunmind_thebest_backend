import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean({ message: 'Должно быть boolean' })
  emergencyAlertsEnabled?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Должно быть boolean' })
  pushNotificationsEnabled?: boolean;
}
