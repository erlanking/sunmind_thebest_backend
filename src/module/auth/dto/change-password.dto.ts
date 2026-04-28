import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Должно быть строкой' })
  currentPassword!: string;

  @IsString({ message: 'Должно быть строкой' })
  @Length(8, 16, { message: 'Пароль должен быть от 8 до 16 символов' })
  newPassword!: string;
}
