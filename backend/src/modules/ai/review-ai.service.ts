import { Injectable } from '@nestjs/common';
import { AiService as BaseAiService } from './ai.service';
import { AiReviewInput, AiReviewOutput, DocumentGenerationInput } from './ai.service';

@Injectable()
export class ReviewAiService {
  constructor(private aiService: BaseAiService) {}

  async review(input: AiReviewInput): Promise<AiReviewOutput> {
    return this.aiService.reviewCase(input);
  }

  async generateDocument(input: DocumentGenerationInput): Promise<string> {
    return this.aiService.generateDocument(input);
  }

  async generateReport(caseId: string, caseData: any): Promise<string> {
    return this.aiService.generateInitialReport(caseId, caseData);
  }
}
