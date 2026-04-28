import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import { UserCreateDto } from './dto/create-user.dto';
import { CustomLogger } from '@/helpers/logger/logger.service';
import * as bcrypt from 'bcrypt';
import { RoleEntity } from '../database/entities/role.entity';

type UserSettings = Pick<
  UserEntity,
  'emergencyAlertsEnabled' | 'pushNotificationsEnabled'
>;

type GoogleProfile = {
  email: string;
  name: string;
  googleId: string;
  avatar?: string | null;
};

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
    private readonly logger: CustomLogger,
  ) {}

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findOneByGoogleId(googleId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { googleId },
      relations: ['roles'],
    });
  }

  async findOneById(userId: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
  }

  async createUser(userData: UserCreateDto, refId: string) {
    this.logger.debug(
      `[SERVICE] createUser: ${JSON.stringify(userData)}`,
      refId,
    );
    try {
      this.logger.debug(`[SERVICE] createUser SUCCESS`, refId);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const role = await this.getDefaultUserRole();

      const user = this.userRepository.create({
        ...userData,
        password: hashedPassword,
        roles: [role],
      });
      return await this.userRepository.save(user);
    } catch (error) {
      throw error;
    }
  }

  async createGoogleUser(profile: GoogleProfile): Promise<UserEntity> {
    const role = await this.getDefaultUserRole();
    const user = this.userRepository.create({
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      avatar: profile.avatar ?? null,
      password: null,
      roles: [role],
    });

    return this.userRepository.save(user);
  }

  async updateGoogleProfile(
    user: UserEntity,
    profile: GoogleProfile,
  ): Promise<UserEntity> {
    user.email = profile.email;
    user.name = profile.name;
    user.googleId = profile.googleId;
    user.avatar = profile.avatar ?? null;

    if (!user.roles?.length) {
      user.roles = [await this.getDefaultUserRole()];
    }

    return this.userRepository.save(user);
  }

  async updatePassword(user: UserEntity, password: string): Promise<UserEntity> {
    user.password = password;
    return this.userRepository.save(user);
  }

  async updateSettings(
    user: UserEntity,
    settings: Partial<UserSettings>,
  ): Promise<UserEntity> {
    if (settings.emergencyAlertsEnabled !== undefined) {
      user.emergencyAlertsEnabled = settings.emergencyAlertsEnabled;
    }

    if (settings.pushNotificationsEnabled !== undefined) {
      user.pushNotificationsEnabled = settings.pushNotificationsEnabled;
    }

    return this.userRepository.save(user);
  }

  async saveFcmToken(userId: number, token: string): Promise<void> {
    await this.userRepository.update(userId, { fcmToken: token });
  }

  async getAllFcmTokens(): Promise<{ id: number; email: string; fcmToken: string }[]> {
    const users = await this.userRepository.find({
      where: { pushNotificationsEnabled: true },
      select: ['id', 'email', 'fcmToken'],
    });
    return users.filter((u) => !!u.fcmToken) as any;
  }

  getSettings(user: UserEntity): UserSettings {
    return {
      emergencyAlertsEnabled: user.emergencyAlertsEnabled,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
    };
  }

  toSafeUser(user: UserEntity) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      googleId: user.googleId ?? null,
      avatar: user.avatar ?? null,
      createdAt: user.createdAt,
      roles: user.roles,
      ...this.getSettings(user),
    };
  }

  toGoogleAuthUser(user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      photo: user.avatar ?? null,
      avatar: user.avatar ?? null,
    };
  }

  async comparePassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private async getDefaultUserRole(): Promise<RoleEntity> {
    let role = await this.roleRepository.findOne({
      where: { role_name: 'USER' },
    });

    if (!role) {
      role = await this.roleRepository.save({
        role_name: 'USER',
        description: 'Default user role',
      });
    }

    return role;
  }
}
