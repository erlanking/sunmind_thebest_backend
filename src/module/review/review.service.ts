import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from '../database/entities/review.entity';
import { ReviewResponseDto } from './dto/review.res.dto';
import { CreateReviewDto } from './dto/review.dto';
import { CustomLogger } from '@/helpers/logger/logger.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
    private readonly logger: CustomLogger,
  ) {}

  async findAll(refId: string): Promise<ReviewResponseDto[]> {
    this.logger.debug('Запрос на получение списка отзывов', refId);

    try {
      const reviews = await this.reviewRepository.find({
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(
        `Сырые данные из БД: ${JSON.stringify(reviews)}`,
        refId,
      );
      this.logger.debug(
        `Отзывы успешно получены. Количество: ${reviews.length}`,
        refId,
      );

      return reviews.map((review) => this.mapToResponseDto(review));
    } catch (error) {
      this.logger.error(
        'Ошибка при получении отзывов',
        error instanceof Error ? error.stack || error.message : String(error),
      );
      throw new HttpException(
        'Ошибка при получении отзывов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(
    createReviewDto: CreateReviewDto,
    refId: string,
  ): Promise<ReviewResponseDto> {
    this.logger.debug('Создание нового отзыва', refId);

    try {
      const review = this.reviewRepository.create(createReviewDto);
      const savedReview = await this.reviewRepository.save(review);

      return this.mapToResponseDto(savedReview);
    } catch (error) {
      this.logger.error(
        'Ошибка при создании отзыва',
        error instanceof Error ? error.stack || error.message : String(error),
      );
      throw new HttpException(
        'Ошибка при создании отзыва',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapToResponseDto(review: ReviewEntity): ReviewResponseDto {
    return {
      id: review.id,
      author: review.author,
      text: review.text,
      rating: review.rating,
      date: review.createdAt,
    };
  }
}
