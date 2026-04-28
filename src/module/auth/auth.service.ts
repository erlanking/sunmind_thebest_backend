import {
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CustomLogger } from '@/helpers/logger/logger.service';
import { UserCreateDto } from '../user/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleVerifyTimeoutMs: number;

  constructor(
    private readonly userService: UserService,
    private readonly logger: CustomLogger,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleVerifyTimeoutMs = this.getGoogleVerifyTimeoutMs();
    this.googleClient = new OAuth2Client({
      transporterOptions: {
        timeout: this.googleVerifyTimeoutMs,
      },
    });
  }

  async register(userData: UserCreateDto, refId: string) {
    this.logger.debug(`[SERVICE] register: ${JSON.stringify(userData)}`, refId);
    try {
      const existingUser = await this.userService.findOneByEmail(
        userData.email,
      );
      if (existingUser) {
        this.logger.error(
          `[SERVICE] register failed: Email already exists`,
          refId,
        );
        throw new HttpException(
          'Пользователь существует',
          HttpStatus.BAD_REQUEST,
        );
      }
      const user = await this.userService.createUser(userData, refId);
      if (user) {
        this.logger.debug(`[SERVICE] register success: ${user.id}`, refId);
      }
      return user ? this.userService.toSafeUser(user) : user;
    } catch (error) {
      this.logger.error(`[SERVICE] register failed: ${error}`, refId);
      throw error;
    }
  }

  async login(loginData: any, refId: string) {
    this.logger.debug(`[SERVICE] login: ${JSON.stringify(loginData)}`, refId);
    try {
      const user = await this.userService.findOneByEmail(loginData.email);
      if (!user) {
        this.logger.error(`[SERVICE] login failed: User not found`, refId);
        throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
      }

      if (!user.password) {
        throw new UnauthorizedException('Используйте вход через Google');
      }

      const passwordHash = user.password;

      const passwordEqual = await this.userService.comparePassword(
        loginData.password,
        passwordHash,
      );

      if (user && passwordEqual) {
        return {
          access_token: this.jwtService.sign(this.buildJwtPayload(user)),
        };
      }

      throw new HttpException('Неверный пароль', HttpStatus.BAD_REQUEST);
    } catch (error) {
      this.logger.error(`[SERVICE] login failed: ${error}`, refId);
      throw error;
    }
  }

  async aboutMe(userId: number, refId: string) {
    this.logger.debug(`[SERVICE] aboutMe`, refId);
    try {
      const user = await this.userService.findOneById(userId);
      if (!user) {
        throw new HttpException(
          'Пользователь не найден',
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.debug(`[SERVICE] aboutMe SUCCESS`, refId);
      return this.userService.toSafeUser(user);
    } catch (error) {
      this.logger.error(`[SERVICE] aboutMe failed: ${error}`, refId);
      throw error;
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    refId: string,
  ) {
    this.logger.debug(`[SERVICE] changePassword`, refId);
    try {
      const user = await this.userService.findOneById(userId);
      if (!user) {
        throw new HttpException(
          'Пользователь не найден',
          HttpStatus.NOT_FOUND,
        );
      }

      if (!user.password) {
        throw new UnauthorizedException('У пользователя не установлен пароль');
      }

      const passwordEqual = await this.userService.comparePassword(
        currentPassword,
        user.password,
      );

      if (!passwordEqual) {
        throw new HttpException(
          'Текущий пароль неверный',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (newPassword.length < 8) {
        throw new HttpException(
          'Пароль должен быть не короче 8 символов',
          HttpStatus.BAD_REQUEST,
        );
      }

      const hashedPassword = await this.userService.hashPassword(newPassword);
      await this.userService.updatePassword(user, hashedPassword);

      return {
        status: 'success',
        message: 'Password changed successfully',
      };
    } catch (error) {
      this.logger.error(`[SERVICE] changePassword failed: ${error}`, refId);
      throw error;
    }
  }

  async getMySettings(userId: number, refId: string) {
    this.logger.debug(`[SERVICE] getMySettings`, refId);
    try {
      const user = await this.userService.findOneById(userId);
      if (!user) {
        throw new HttpException(
          'Пользователь не найден',
          HttpStatus.NOT_FOUND,
        );
      }

      return this.userService.getSettings(user);
    } catch (error) {
      this.logger.error(`[SERVICE] getMySettings failed: ${error}`, refId);
      throw error;
    }
  }

  async updateMySettings(
    userId: number,
    dto: UpdateUserSettingsDto,
    refId: string,
  ) {
    this.logger.debug(`[SERVICE] updateMySettings`, refId);
    try {
      const user = await this.userService.findOneById(userId);
      if (!user) {
        throw new HttpException(
          'Пользователь не найден',
          HttpStatus.NOT_FOUND,
        );
      }

      const updatedUser = await this.userService.updateSettings(user, dto);
      return this.userService.getSettings(updatedUser);
    } catch (error) {
      this.logger.error(`[SERVICE] updateMySettings failed: ${error}`, refId);
      throw error;
    }
  }

  async saveFcmToken(userId: number, token: string): Promise<void> {
    await this.userService.saveFcmToken(userId, token);
  }

  async googleLogin(dto: GoogleLoginDto, refId: string) {
    this.logger.debug(`[SERVICE] googleLogin`, refId);
    try {
      const idToken = dto.idToken?.trim();
      if (!idToken) {
        throw new BadRequestException('idToken is required');
      }

      const audience = this.getGoogleClientIds();
      this.logger.debug(
        `[SERVICE] googleLogin incoming idToken prefix: ${idToken.slice(0, 16)}...`,
        refId,
      );
      this.logger.debug(
        `[SERVICE] googleLogin audience: ${audience.join(', ')}`,
        refId,
      );
      this.logger.debug(
        `[SERVICE] googleLogin verifying token with Google timeout=${this.googleVerifyTimeoutMs}ms`,
        refId,
      );

      const ticket = await this.googleClient.verifyIdToken(
        {
          idToken,
          audience: audience.length === 1 ? audience[0] : audience,
        },
      );

      const payload = ticket.getPayload();
      this.logger.debug(
        `[SERVICE] googleLogin payload received: sub=${payload?.sub ?? 'unknown'}, email=${payload?.email ?? 'unknown'}`,
        refId,
      );

      const email = payload?.email?.trim().toLowerCase();
      const name = payload?.name?.trim() || email?.split('@')[0] || 'Google User';

      if (!payload?.sub || !email || !payload.email_verified) {
        throw new UnauthorizedException('Некорректный Google токен');
      }

      const googleProfile = {
        email,
        name,
        picture: payload.picture ?? null,
        googleId: payload.sub,
      };

      this.logger.debug(
        `[SERVICE] googleLogin payload: googleId=${googleProfile.googleId}, email=${googleProfile.email}`,
        refId,
      );
      this.logger.debug(
        `[SERVICE] googleLogin looking up user by googleId/email`,
        refId,
      );

      const [userByGoogleId, userByEmail] = await Promise.all([
        this.userService.findOneByGoogleId(googleProfile.googleId),
        this.userService.findOneByEmail(googleProfile.email),
      ]);
      this.logger.debug(
        `[SERVICE] googleLogin lookup done: userByGoogleId=${userByGoogleId?.id ?? 'null'}, userByEmail=${userByEmail?.id ?? 'null'}`,
        refId,
      );

      if (
        userByGoogleId &&
        userByEmail &&
        userByGoogleId.id !== userByEmail.id
      ) {
        this.logger.error(
          `[SERVICE] googleLogin conflict: googleId=${googleProfile.googleId}, email=${googleProfile.email}, userByGoogleId=${userByGoogleId.id}, userByEmail=${userByEmail.id}`,
          refId,
        );
        throw new UnauthorizedException(
          'Google account is linked to another user',
        );
      }

      let user = userByGoogleId ?? userByEmail;

      if (!user) {
        user = await this.userService.createGoogleUser({
          email: googleProfile.email,
          name: googleProfile.name,
          googleId: googleProfile.googleId,
          avatar: googleProfile.picture,
        });
        this.logger.debug(
          `[SERVICE] googleLogin created user: id=${user.id}, googleId=${googleProfile.googleId}, email=${googleProfile.email}`,
          refId,
        );
      } else {
        this.logger.debug(
          `[SERVICE] googleLogin found user: id=${user.id}, googleId=${user.googleId ?? 'null'}, email=${user.email}`,
          refId,
        );
        user = await this.userService.updateGoogleProfile(user, {
          email: googleProfile.email,
          name: googleProfile.name,
          googleId: googleProfile.googleId,
          avatar: googleProfile.picture,
        });
        this.logger.debug(
          `[SERVICE] googleLogin updated user: id=${user.id}, googleId=${user.googleId ?? 'null'}, email=${user.email}`,
          refId,
        );
      }

      const accessToken = this.jwtService.sign(this.buildJwtPayload(user));

      return {
        accessToken,
        refreshToken: null,
        token: accessToken,
        user: this.userService.toGoogleAuthUser(user),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.error(`[SERVICE] googleLogin failed: ${error.message}`, refId);
        throw error;
      }

      if (error instanceof GatewayTimeoutException) {
        this.logger.error(`[SERVICE] googleLogin failed: ${error.message}`, refId);
        throw error;
      }

      if (error instanceof UnauthorizedException) {
        this.logger.error(`[SERVICE] googleLogin failed: ${error.message}`, refId);
        throw error;
      }

      if (this.isGoogleTimeoutError(error)) {
        this.logger.error(
          `[SERVICE] googleLogin failed: Google token verification timed out after ${this.googleVerifyTimeoutMs}ms`,
          refId,
        );
        throw new GatewayTimeoutException(
          'Google token verification timed out',
        );
      }

      this.logger.error(`[SERVICE] googleLogin failed: ${error}`, refId);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  private buildJwtPayload(user: {
    id: number;
    email: string;
    roles?: unknown[];
  }) {
    return {
      email: user.email,
      sub: user.id,
      roles: user.roles ?? [],
    };
  }

  private getGoogleClientIds(): string[] {
    const configuredValues = [
      this.configService.get<string>('GOOGLE_CLIENT_IDS'),
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID'),
    ]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) =>
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );

    const clientIds = [...new Set(configuredValues)];

    if (!clientIds.length) {
      throw new UnauthorizedException('Google authentication is not configured');
    }

    return clientIds;
  }

  private getGoogleVerifyTimeoutMs(): number {
    const configuredValue =
      this.configService.get<string>('GOOGLE_VERIFY_TIMEOUT_MS')?.trim() || '';
    const parsedValue = Number(configuredValue);

    if (Number.isFinite(parsedValue) && parsedValue >= 1000) {
      return parsedValue;
    }

    return 5000;
  }

  private isGoogleTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('deadline exceeded') ||
      message.includes('request aborted')
    );
  }
}
