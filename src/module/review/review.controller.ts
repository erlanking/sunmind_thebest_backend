import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { RefId } from '../../decorators/ref.decorator';
import { ReviewResponseDto } from './dto/review.res.dto';
import { CreateReviewDto } from './dto/review.dto';

@ApiTags('Review')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить список отзывов',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список отзывов',
    type: [ReviewResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Ошибка сервера',
  })
  async getReviews(@RefId() refId: string): Promise<ReviewResponseDto[]> {
    return this.reviewService.findAll(refId);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Создать новый отзыв',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Отзыв успешно создан',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Неверные данные',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Ошибка сервера',
  })
  async createReview(
    @Body() createReviewDto: CreateReviewDto,
    @RefId() refId: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.create(createReviewDto, refId);
  }
}
