import { Module } from '@nestjs/common';
import { ClueController } from './clue.controller';
import { ClueService } from './clue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  controllers: [ClueController],
  providers: [ClueService],
  exports: [ClueService],
})
export class ClueModule {}
