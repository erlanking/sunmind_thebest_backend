import { IsString } from 'class-validator';

export class RoleCreateDto {
  @IsString({ message: 'Должно быть строкой' })
  role_name!: string;
  @IsString({ message: 'Должно быть строкой' })
  description!: string;
}
