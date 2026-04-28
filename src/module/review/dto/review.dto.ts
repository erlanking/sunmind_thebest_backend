import { IsString, IsInt, Min, Max, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    example: 'Иван Сидоров',
    description: 'Автор отзыва',
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  author!: string;

  @ApiProperty({
    example: 'Очень удобное управление через приложение. Рекомендую!',
    description: 'Текст отзыва',
    maxLength: 2000,
  })
  @IsString()
  @Length(1, 2000)
  text!: string;

  @ApiProperty({
    example: 5,
    description: 'Оценка от 1 до 5',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}
