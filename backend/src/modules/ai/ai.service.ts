import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface AiReviewInput {
  applicantName: string;
  applicantIdNo: string;
  claimType: string;
  claimOriginal: string;
  amount: number;
  personCount: number;
  evidenceTypes?: string[];
  filedAt: string;
}

export interface ReviewDimension {
  dimension: string;
  result: 'pass' | 'warning' | 'fail';
  reason: string;
  confidence: number;
  suggestions: string;
}

export interface AiReviewOutput {
  conclusion: 'accept' | 'need_more_evidence' | 'reject';
  conclusionText: string;
  dimensions: ReviewDimension[];
  riskLevel: 'high' | 'medium' | 'low';
  riskReasons: string[];
  missingEvidence: string[];
  legalReferences: string[];
}

export interface DocumentGenerationInput {
  docType: string;
  caseNo: string;
  applicantName: string;
  respondentName: string;
  claimContent: string;
  amount: number;
  personCount: number;
  projectName?: string;
  evidenceSummary?: string;
  reviewConclusion?: string;
  handlerName?: string;
  filedAt?: string;
}

export interface ClaimPolishingInput {
  originalText: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.deepseek.com';
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || 'deepseek-chat';
  }

  async polishClaim(input: ClaimPolishingInput): Promise<{ result: string }> {
    const polished = await this._polishClaim(input.originalText);
    return { result: polished };
  }

  async reviewCase(input: AiReviewInput): Promise<AiReviewOutput> {
    if (!this.apiKey) return this._mockReview(input);

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一位专业的检察业务专家，擅长支持起诉案件审查。请根据以下线索信息，判断是否符合支持起诉受理条件，并给出详细的审查意见。回复JSON格式。',
            },
            { role: 'user', content: JSON.stringify(input) },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        },
        { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 },
      );
      const content = response.data.choices[0].message.content.trim();
      try { return JSON.parse(content); } catch { return this._mockReview(input); }
    } catch (e) {
      this.logger.warn(`AI review failed: ${e.message}`);
      return this._mockReview(input);
    }
  }

  async generateDocument(input: DocumentGenerationInput): Promise<string> {
    if (!this.apiKey) return this._mockGenerateDocument(input);

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: '你是一位专业的检察文书撰写专家。请根据提供的案件信息，生成一份规范的支持起诉意见书草稿。' },
            { role: 'user', content: JSON.stringify(input) },
          ],
          temperature: 0.3,
          max_tokens: 3000,
        },
        { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 },
      );
      return response.data.choices[0].message.content.trim();
    } catch (e) {
      this.logger.warn(`AI doc gen failed: ${e.message}`);
      return this._mockGenerateDocument(input);
    }
  }

  async generateInitialReport(caseId: string, caseData: any): Promise<string> {
    if (!this.apiKey) return this._mockGenerateReport(caseData);

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: '你是一位专业的检察业务分析专家。请根据案件信息，生成一份《支持起诉案件初步分析报告》。' },
            { role: 'user', content: JSON.stringify(caseData) },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        },
        { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 90000 },
      );
      return response.data.choices[0].message.content.trim();
    } catch (e) {
      this.logger.warn(`AI report gen failed: ${e.message}`);
      return this._mockGenerateReport(caseData);
    }
  }

  // --- Mock implementations ---

  private async _polishClaim(original: string): Promise<string> {
    if (this.apiKey) {
      try {
        const response = await axios.post(
          `${this.apiBaseUrl}/v1/chat/completions`,
          {
            model: this.model,
            messages: [
              { role: 'system', content: '将口语化欠薪诉求转化为规范法律用语，仅输出润色后文本。' },
              { role: 'user', content: original },
            ],
            temperature: 0.3,
            max_tokens: 500,
          },
          { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 },
        );
        return response.data.choices[0].message.content.trim();
      } catch (e) { this.logger.warn(`Polish failed: ${e.message}`); }
    }
    return original.replace(/包工头/g, '承建方').replace(/欠我钱/g, '拖欠本人劳动报酬').replace(/一直拖/g, '经多次催告仍拒不支付') + '，请求检察机关依法支持起诉，维护本人合法劳动权益。';
  }

  private _mockReview(input: AiReviewInput): AiReviewOutput {
    const dimensions: ReviewDimension[] = [
      { dimension: '申请人主体资格', result: 'pass', reason: '申请人信息完整，属于农民工群体，具备主体资格', confidence: 0.92, suggestions: '' },
      { dimension: '诉求明确性', result: 'pass', reason: '诉求内容清晰，欠薪事实明确', confidence: 0.88, suggestions: '' },
      { dimension: '基本事实证据', result: 'warning', reason: '缺少部分证据材料', confidence: 0.75, suggestions: '建议补充近6个月工资银行流水' },
      { dimension: '管辖合规性', result: 'pass', reason: '项目位于本院管辖范围内', confidence: 0.95, suggestions: '' },
      { dimension: '诉讼时效', result: 'pass', reason: '未超过诉讼时效', confidence: 0.90, suggestions: '' },
    ];

    const hasWarnings = dimensions.some((d) => d.result === 'warning');
    const hasFails = dimensions.some((d) => d.result === 'fail');

    return {
      conclusion: hasFails ? 'reject' : hasWarnings ? 'need_more_evidence' : 'accept',
      conclusionText: hasFails ? '不符合受理条件，建议不予受理' : hasWarnings ? '存在以下不符合项，建议补充材料后受理' : '经AI审查，该线索符合支持起诉受理基本条件，建议受理',
      dimensions,
      riskLevel: input.personCount >= 30 ? 'high' : input.personCount >= 10 ? 'medium' : 'low',
      riskReasons: input.personCount >= 30 ? ['涉及人数≥30，存在群体性风险', '建议启动涉稳风险防控机制'] : [],
      missingEvidence: hasWarnings ? ['近6个月工资银行流水', '项目分包合同'] : [],
      legalReferences: ['《中华人民共和国民法典》第五百零九条', '《保障农民工工资支付条例》第三条', '《中华人民共和国民事诉讼法》第一百二十二条'],
    };
  }

  private _mockGenerateDocument(input: DocumentGenerationInput): string {
    return `支持起诉意见书\n\n${input.caseNo}\n\n申请人：${input.applicantName}\n被申请人：${input.respondentName}\n\n一、案件基本情况\n申请人因被申请人拖欠劳动报酬，特向检察机关申请支持起诉。\n\n二、事实与理由\n${input.claimContent}\n\n三、法律依据\n1. 《中华人民共和国民法典》第五百零九条\n2. 《保障农民工工资支付条例》第三条\n\n四、审查意见\n经审查，申请人申请符合法律规定，建议支持起诉。\n\n                           承办检察官：${input.handlerName || '___'}\n                           ${new Date().toLocaleDateString('zh-CN')}`;
  }

  private _mockGenerateReport(caseData: any): string {
    return `# 支持起诉案件初步分析报告\n\n## 一、案件基本情况\n案件编号：${caseData.caseNo || '待编号'}\n申请人：${caseData.applicantName}\n被申请人：${caseData.respondentName}\n涉案金额：${caseData.amount || '待核实'} 元\n涉及人数：${caseData.personCount || 1} 人\n\n## 二、争议焦点\n1. 事实劳动关系认定问题\n2. 工资支付主体责任问题\n3. 欠薪金额认定问题\n\n## 三、法律适用分析\n根据《保障农民工工资支付条例》及《民法典》相关规定，被申请人应当按时足额支付农民工工资。\n\n## 四、证据情况分析\n现有证据基本能够证明欠薪事实，但需补充关键证据。\n\n## 五、办案重点与难点\n1. 劳动关系证据链的完整性\n2. 欠薪金额的精确核算\n\n## 六、补证建议\n1. 建议调取项目农民工工资专户流水\n2. 建议调取施工总包与包工头的分包合同\n\n## 七、风险提示\n${caseData.personCount >= 30 ? '本案涉及人数≥30人，存在群体性事件风险，建议启动涉稳风险防控预案。' : '本案风险等级为中等，需持续关注。'}`;
  }
}
