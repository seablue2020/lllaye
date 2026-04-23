import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ClueModule } from './modules/clue/clue.module';
import { ReviewModule } from './modules/review/review.module';
import { DocumentModule } from './modules/document/document.module';
import { BatchModule } from './modules/batch/batch.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { SystemModule } from './modules/system/system.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { BullModule } from './common/bull/bull.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.development', '.env'],
      load: [() => import('./configuration').then((m) => m.default())],
    }),
    PrismaModule,
    RedisModule,
    BullModule,
    EncryptionModule,
    AuthModule,
    ClueModule,
    ReviewModule,
    DocumentModule,
    BatchModule,
    StatisticsModule,
    SystemModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
