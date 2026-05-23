import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const databaseSsl = configService.get<string>('DATABASE_SSL');

        const shouldUseSsl =
          databaseSsl === 'true' ||
          databaseSsl === '1' ||
          databaseUrl?.includes('sslmode=require') ||
          databaseUrl?.includes('ssl=true') ||
          databaseUrl?.includes('.neon.tech') ||
          false;

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: true,
          extra: {
            family: 4,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10,
          },
        };
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class DataBaseModule {}
