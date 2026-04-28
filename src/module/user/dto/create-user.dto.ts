import { IsEmail, IsString, Length } from 'class-validator';

export class UserCreateDto {
  @IsString({ message: 'Должно быть строкой' })
  name!: string;
  @IsString({ message: 'Должно быть строкой' })
  @IsEmail({}, { message: 'Некорректный email' })
  email!: string;
  @IsString({ message: 'Должно быть строкой' })
  @Length(8, 16, { message: 'Пароль должен быть от 8 до 16 символов' })
  password!: string;
}
