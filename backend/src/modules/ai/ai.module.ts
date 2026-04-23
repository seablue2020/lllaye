import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { BullQueue } from '../../common/bull/bull.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 60000, maxRedirects: 5 }),
    BullModule.registerQueue({ name: BullQueue.AI_OCR }),
    BullModule.registerQueue({ name: BullQueue.AI_ASR }),
    BullModule.registerQueue({ name: BullQueue.AI_DOCUMENT }),
    BullModule.registerQueue({ name: BullQueue.AI_REVIEW }),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
