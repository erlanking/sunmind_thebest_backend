import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import { UserService } from '../user/user.service';

const FCM_URL = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly projectId = 'sunmind-thebest';

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  private getAuth(): GoogleAuth | null {
    const keyPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    const keyJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');

    const keyBase64 = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64');

    if (keyBase64) {
      try {
        const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString());
        return new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
      } catch {
        this.logger.error('Ошибка парсинга FIREBASE_SERVICE_ACCOUNT_BASE64');
        return null;
      }
    }

    if (keyJson) {
      try {
        const credentials = JSON.parse(keyJson);
        return new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
      } catch {
        this.logger.error('Ошибка парсинга FIREBASE_SERVICE_ACCOUNT_JSON');
        return null;
      }
    }

    if (keyPath) {
      return new GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
    }

    return null;
  }

  private async getAccessToken(): Promise<string | null> {
    const auth = this.getAuth();
    if (!auth) return null;
    try {
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      return tokenResponse.token ?? null;
    } catch (err: any) {
      this.logger.error(`Ошибка получения Firebase access token: ${err?.message ?? err}`);
      return null;
    }
  }

  async sendToToken(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      this.logger.warn('Firebase service account не настроен или недоступен — уведомление не отправлено');
      return false;
    }

    try {
      await axios.post(
        FCM_URL(this.projectId),
        {
          message: {
            token: fcmToken,
            notification: { title, body },
            data: data ?? {},
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return true;
    } catch (err: any) {
      this.logger.error(`FCM ошибка для токена ${fcmToken.slice(0, 20)}...: ${err?.response?.data?.error?.message ?? err.message}`);
      return false;
    }
  }

  async sendToAll(title: string, body: string): Promise<{ sent: number; failed: number }> {
    try {
      const users = await this.userService.getAllFcmTokens();
      let sent = 0;
      let failed = 0;
      for (const user of users) {
        const ok = await this.sendToToken(user.fcmToken, title, body, { type: 'admin' });
        ok ? sent++ : failed++;
      }
      this.logger.log(`Рассылка завершена: отправлено ${sent}, ошибок ${failed}`);
      return { sent, failed };
    } catch (err: any) {
      this.logger.error(`sendToAll error: ${err?.stack ?? err?.message}`);
      return { sent: 0, failed: 0 };
    }
  }

  async sendToUser(userId: number, title: string, body: string): Promise<{ sent: number; failed: number }> {
    try {
      const users = await this.userService.getAllFcmTokens();
      const user = users.find((u) => u.id === userId);
      if (!user) return { sent: 0, failed: 1 };
      const ok = await this.sendToToken(user.fcmToken, title, body, { type: 'admin' });
      return ok ? { sent: 1, failed: 0 } : { sent: 0, failed: 1 };
    } catch (err: any) {
      this.logger.error(`sendToUser error: ${err?.stack ?? err?.message}`);
      return { sent: 0, failed: 1 };
    }
  }
}
