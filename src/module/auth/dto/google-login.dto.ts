import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString({ message: 'idToken должен быть строкой' })
  @IsNotEmpty({ message: 'idToken обязателен' })
  idToken!: string;
}
