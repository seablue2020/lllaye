import { Injectable, Module } from '@nestjs/common';
import { BullModule as NestBullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const BullQueue = {
  AI_OCR: 'ai-ocr',
  AI_ASR: 'ai-asr',
  AI_SEMANTIC: 'ai-semantic',
  AI_DOCUMENT: 'ai-document',
  AI_REVIEW: 'ai-review',
} as const;

@Module({
  imports: [
    NestBullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
    }),
  ],
})
export class BullModule {}
