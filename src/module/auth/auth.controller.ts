import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CustomLogger } from '@/helpers/logger/logger.service';
import { RefId } from '../../decorators/ref.decorator';
import { UserCreateDto } from '../user/dto/create-user.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth-guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@Controller(['auth', 'api/auth'])
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
  ) {}

  private getUserId(req: any): number {
    return req.user?.sub || req.user?.id;
  }

  @Post('register')
  async register(@Body() userData: UserCreateDto, @RefId() refId: string) {
    this.logger.debug(
      `[CONTROLLER] register: ${JSON.stringify(userData)}`,
      refId,
    );
    try {
      const user = await this.authService.register(userData, refId);
      if (user) {
        this.logger.debug(
          `[CONTROLLER] register SUCCESS: ${user.email}`,
          refId,
        );
      }
      return user;
    } catch (error) {
      this.logger.error(`[CONTROLLER] register failed: ${error}`, refId);
      throw error;
    }
  }

  @Post('login')
  async login(@Body() userData: any, @RefId() refId: string) {
    this.logger.debug(`[CONTROLLER] login: ${JSON.stringify(userData)}`, refId);
    try {
      const user = await this.authService.login(userData, refId);
      if (user) {
        this.logger.debug(`[CONTROLLER] login SUCCESS: ${user}`, refId);
      }

      return user;
    } catch (error) {
      this.logger.error(`[CONTROLLER] login failed: ${error}`, refId);
      throw error;
    }
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @RefId() refId: string,
  ) {
    this.logger.debug(
      `[CONTROLLER] googleLogin: idToken received`,
      refId,
    );
    try {
      const response = await this.authService.googleLogin(dto, refId);
      this.logger.debug(
        `[CONTROLLER] googleLogin SUCCESS: userId=${response.user.id}, email=${response.user.email}`,
        refId,
      );
      return response;
    } catch (error) {
      this.logger.error(`[CONTROLLER] googleLogin failed: ${error}`, refId);
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard as any)
  async aboutMe(
    @Req() req,
    @RefId() refId: string,
  ) {
    this.logger.debug(`[CONTROLLER] aboutme`, refId);
    try {
      const user = await this.authService.aboutMe(this.getUserId(req), refId);
      this.logger.debug(`[CONTROLLER] aboutme SUCCESS: ${user}`, refId);
      return user;
    } catch (error) {
      this.logger.error(`[CONTROLLER] aboutme failed: ${error}`, refId);
      throw error;
    }
  }

  @Post('change-password')
  @Patch('change-password')
  @UseGuards(JwtAuthGuard as any)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async changePassword(
    @Req() req,
    @Body() dto: ChangePasswordDto,
    @RefId() refId: string,
  ) {
    this.logger.debug(`[CONTROLLER] changePassword`, refId);
    return this.authService.changePassword(
      this.getUserId(req),
      dto.currentPassword,
      dto.newPassword,
      refId,
    );
  }

  @Get('me/settings')
  @UseGuards(JwtAuthGuard as any)
  async getMySettings(@Req() req, @RefId() refId: string) {
    this.logger.debug(`[CONTROLLER] getMySettings`, refId);
    return this.authService.getMySettings(this.getUserId(req), refId);
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard as any)
  async saveFcmToken(@Req() req, @Body() body: { token: string }) {
    await this.authService.saveFcmToken(this.getUserId(req), body.token);
    return { success: true };
  }

  @Patch('me/settings')
  @UseGuards(JwtAuthGuard as any)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateMySettings(
    @Req() req,
    @Body() dto: UpdateUserSettingsDto,
    @RefId() refId: string,
  ) {
    this.logger.debug(`[CONTROLLER] updateMySettings`, refId);
    return this.authService.updateMySettings(this.getUserId(req), dto, refId);
  }
}
