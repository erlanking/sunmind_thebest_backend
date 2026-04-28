import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({
    description: 'UUID отзыва',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    example: 'Иван Сидоров',
    description: 'Автор отзыва',
  })
  author!: string;

  @ApiProperty({
    example: 'Очень удобное управление через приложение. Рекомендую!',
    description: 'Текст отзыва',
  })
  text!: string;

  @ApiProperty({
    example: 5,
    description: 'Оценка от 1 до 5',
    minimum: 1,
    maximum: 5,
  })
  rating!: number;

  @ApiProperty({
    description: 'Дата создания отзыва',
    example: '2024-01-15T10:30:00.000Z',
  })
  date!: Date;
}
