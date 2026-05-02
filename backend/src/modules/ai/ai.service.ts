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
  projectName?: string;
  respondentName?: string;
  respondentOrg?: string;
  subjectName?: string;
  subjectType?: string;
  claimSource?: string;
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
  fallback?: boolean;
  fallbackReason?: string;
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
  private readonly apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.deepseek.com';
  private readonly apiKey = process.env.AI_API_KEY || '';
  private readonly model = process.env.AI_MODEL || 'deepseek-chat';
  private readonly reviewTimeoutMs = Number(process.env.AI_REVIEW_TIMEOUT_MS || 90000);
  private readonly documentTimeoutMs = Number(process.env.AI_DOCUMENT_TIMEOUT_MS || 90000);
  private readonly reportTimeoutMs = Number(process.env.AI_REPORT_TIMEOUT_MS || 120000);

  async polishClaim(input: ClaimPolishingInput): Promise<{ result: string }> {
    if (!this.apiKey) {
      return { result: this.rulePolishClaim(input.originalText) };
    }

    try {
      const content = await this.chat(
        '将口语化欠薪诉求转换为规范法律表述，只输出润色后的文本。',
        input.originalText,
        500,
        0.3,
        30000,
      );
      return { result: content };
    } catch (error) {
      this.logAiFailure('polish', error);
      return { result: this.rulePolishClaim(input.originalText) };
    }
  }

  async reviewCase(input: AiReviewInput): Promise<AiReviewOutput> {
    if (!this.apiKey) {
      return this.mockReview(input, 'missing_api_key');
    }

    try {
      const content = await this.chat(
        [
          '你是专业检察业务审查助手，擅长支持起诉与欠薪案件审查。',
          '请根据案件信息判断是否符合支持起诉受理条件，并只返回 JSON。',
          'JSON 字段必须包含：conclusion、conclusionText、dimensions、riskLevel、riskReasons、missingEvidence、legalReferences。',
          'conclusion 只能是 accept、need_more_evidence、reject。',
          'dimensions 数组元素字段为 dimension、result、reason、confidence、suggestions；result 只能是 pass、warning、fail。',
        ].join('\n'),
        JSON.stringify(input, null, 2),
        3000,
        0.1,
        this.reviewTimeoutMs,
      );

      const parsed = this.parseJson<AiReviewOutput>(content);
      return this.normalizeReviewOutput(parsed, input);
    } catch (error) {
      const reason = this.getFailureReason(error);
      this.logAiFailure('review', error);
      return this.mockReview(input, reason);
    }
  }

  async generateDocument(input: DocumentGenerationInput): Promise<string> {
    if (!this.apiKey) return this.mockGenerateDocument(input);

    try {
      return await this.chat(
        this.buildDocumentSystemPrompt(input.docType),
        JSON.stringify(input, null, 2),
        4500,
        0.25,
        this.documentTimeoutMs,
      );
    } catch (error) {
      this.logAiFailure('document', error);
      return this.mockGenerateDocument(input);
    }
  }

  async generateInitialReport(_caseId: string, caseData: any): Promise<string> {
    if (!this.apiKey) return this.mockGenerateReport(caseData);

    try {
      return await this.chat(
        '你是专业检察业务分析助手，请根据案件信息生成《支持起诉案件初步分析报告》。',
        JSON.stringify(caseData, null, 2),
        4000,
        0.3,
        this.reportTimeoutMs,
      );
    } catch (error) {
      this.logAiFailure('report', error);
      return this.mockGenerateReport(caseData);
    }
  }

  private async chat(
    system: string,
    user: string,
    maxTokens: number,
    temperature: number,
    timeout: number,
  ): Promise<string> {
    const response = await axios.post(
      `${this.apiBaseUrl}/v1/chat/completions`,
      {
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout,
      },
    );

    return response.data?.choices?.[0]?.message?.content?.trim() || '';
  }

  private parseJson<T>(content: string): T {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced?.[1] || content;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end < start) {
      throw new Error('json_parse_no_object');
    }
    return JSON.parse(raw.slice(start, end + 1));
  }

  private normalizeReviewOutput(output: AiReviewOutput, input: AiReviewInput): AiReviewOutput {
    const fallback = this.mockReview(input, 'invalid_ai_shape');
    return {
      conclusion: output.conclusion || fallback.conclusion,
      conclusionText: output.conclusionText || fallback.conclusionText,
      dimensions: Array.isArray(output.dimensions) && output.dimensions.length ? output.dimensions : fallback.dimensions,
      riskLevel: output.riskLevel || fallback.riskLevel,
      riskReasons: Array.isArray(output.riskReasons) ? output.riskReasons : fallback.riskReasons,
      missingEvidence: Array.isArray(output.missingEvidence) ? output.missingEvidence : fallback.missingEvidence,
      legalReferences: Array.isArray(output.legalReferences) ? output.legalReferences : fallback.legalReferences,
    };
  }

  private buildDocumentSystemPrompt(docType: string) {
    const common = [
      '你是专业法律文书起草助手。',
      '请仅根据给定案件信息生成可编辑的中文文书正文，不要输出 Markdown 代码块。',
      '如信息中没有出现的事实，不得编造；可用“待核实”标注。',
    ];

    const prompts: Record<string, string> = {
      support_prosecution: '生成规范的《支持起诉书》，结构包含当事人信息、基本案情、支持起诉理由、处理意见和落款。',
      civil_complaint: '生成规范的《民事起诉状》，结构包含原告、被告、诉讼请求、事实与理由、证据目录提示、此致法院和落款。',
      civil_judgment: '生成规范的《民事判决书》草稿，结构包含当事人、诉讼请求、查明事实、裁判理由、判决主文和诉讼费用处理。',
    };

    return [...common, prompts[docType] || '生成规范的案件办理文书。'].join('\n');
  }

  private logAiFailure(action: string, error: any) {
    this.logger.warn(`AI ${action} failed: ${this.getFailureReason(error)} ${error?.message || ''}`.trim());
  }

  private getFailureReason(error: any): string {
    if (error?.code === 'ECONNABORTED') return 'timeout';
    if (error?.response?.status) return `api_${error.response.status}`;
    if (error?.message?.startsWith('json_parse')) return 'json_parse';
    return 'network_or_unknown';
  }

  private rulePolishClaim(original: string): string {
    return `${original}。申请人请求检察机关依法支持起诉，维护劳动报酬权益。`;
  }

  private mockReview(input: AiReviewInput, fallbackReason: string): AiReviewOutput {
    const riskLevel: 'high' | 'medium' | 'low' =
      input.personCount >= 30 || input.amount >= 500000
        ? 'high'
        : input.personCount >= 10 || input.amount >= 100000
          ? 'medium'
          : 'low';
    const hasEvidence = Boolean(input.evidenceTypes?.length);
    const riskReasons = [
      ...(input.personCount >= 30 ? [`涉及${input.personCount}人，存在群体性风险`] : []),
      ...(input.amount >= 500000 ? [`涉案金额${input.amount.toLocaleString()}元，金额较高`] : []),
      ...(riskLevel === 'medium' ? ['人数或金额达到重点关注阈值'] : []),
    ];

    const dimensions: ReviewDimension[] = [
      {
        dimension: '申请人主体资格',
        result: 'pass',
        reason: `申请人${input.applicantName}反映劳动报酬纠纷，属于支持起诉审查范围。`,
        confidence: 0.9,
        suggestions: '',
      },
      {
        dimension: '诉求明确性',
        result: input.claimOriginal ? 'pass' : 'warning',
        reason: input.claimOriginal
          ? `诉求指向${input.respondentName || input.subjectName || '被申请主体'}拖欠劳动报酬。`
          : '诉求事实描述不足。',
        confidence: 0.86,
        suggestions: input.claimOriginal ? '' : '补充欠薪期间、工资标准、结算依据。',
      },
      {
        dimension: '基本事实证据',
        result: hasEvidence ? 'pass' : 'warning',
        reason: hasEvidence ? `已提供${input.evidenceTypes!.join('、')}等材料。` : '暂未录入证据材料，需要补强事实基础。',
        confidence: 0.76,
        suggestions: hasEvidence ? '' : '补充劳动合同、考勤记录、工资表、银行流水或欠薪确认单。',
      },
      {
        dimension: '管辖合规性',
        result: input.projectName ? 'pass' : 'warning',
        reason: input.projectName ? `涉案项目为${input.projectName}，可结合项目所在地核验管辖。` : '项目所在地信息不足。',
        confidence: 0.82,
        suggestions: input.projectName ? '' : '补充项目地址和施工主体信息。',
      },
      {
        dimension: '诉讼时效',
        result: 'pass',
        reason: '按现有材料未发现明显超过诉讼时效的情形。',
        confidence: 0.84,
        suggestions: '',
      },
      {
        dimension: '风险等级',
        result: riskLevel === 'high' ? 'warning' : 'pass',
        reason: riskReasons.length ? riskReasons.join('；') : '人数和金额处于常规范围。',
        confidence: 0.88,
        suggestions: riskLevel === 'high' ? '建议同步研判涉稳风险并优先办理。' : '',
      },
    ];

    const hasWarnings = dimensions.some((item) => item.result === 'warning');
    return {
      conclusion: hasWarnings ? 'need_more_evidence' : 'accept',
      conclusionText: hasWarnings ? '建议补充材料后受理，并由承办人复核。' : '符合支持起诉受理的基本条件，建议受理。',
      dimensions,
      riskLevel,
      riskReasons,
      missingEvidence: hasEvidence ? [] : ['劳动合同或用工证明', '考勤记录', '工资结算单', '银行流水或欠薪确认材料'],
      legalReferences: [
        '《中华人民共和国民法典》第五百零九条',
        '《保障农民工工资支付条例》第三条',
        '《中华人民共和国民事诉讼法》第一百二十二条',
        '《中华人民共和国劳动合同法》第三十条',
      ],
      fallback: true,
      fallbackReason,
    };
  }

  private mockGenerateDocument(input: DocumentGenerationInput): string {
    const label = this.getDocTypeLabel(input.docType);
    const baseInfo = [
      `案号：${input.caseNo}`,
      `申请人/原告：${input.applicantName}`,
      `被申请人/被告：${input.respondentName}`,
      `涉案金额：${Number(input.amount || 0).toLocaleString()}元`,
      `涉及人数：${input.personCount || 1}人`,
      '',
      '基本案情：',
      input.claimContent || '待补充案件事实。',
    ].join('\n');

    if (input.docType === 'civil_complaint') {
      return [
        '民事起诉状',
        '',
        baseInfo,
        '',
        '诉讼请求：',
        `1. 判令被告向原告支付拖欠劳动报酬${Number(input.amount || 0).toLocaleString()}元；`,
        '2. 判令被告承担本案诉讼费用。',
        '',
        '事实与理由：',
        '原告因提供劳动与被告发生劳动报酬争议。根据现有材料，被告尚未足额支付劳动报酬，已影响原告合法权益。原告现依法提起诉讼，请求人民法院依法支持。',
        '',
        '此致',
        '人民法院',
        '',
        `具状人：${input.applicantName}`,
        new Date().toLocaleDateString('zh-CN'),
      ].join('\n');
    }

    if (input.docType === 'civil_judgment') {
      return [
        '民事判决书（草稿）',
        '',
        baseInfo,
        '',
        '经审理查明：',
        input.claimContent || '案件事实待进一步查明。',
        '',
        '本院认为：',
        '劳动者取得劳动报酬的合法权益受法律保护。被告未能充分证明已足额支付相关劳动报酬，应依法承担相应民事责任。',
        '',
        '判决如下：',
        `一、被告于本判决生效之日起十日内向原告支付劳动报酬${Number(input.amount || 0).toLocaleString()}元；`,
        '二、驳回原告其他诉讼请求。',
        '',
        '如不服本判决，可依法提起上诉。',
      ].join('\n');
    }

    return [
      `${label}（草稿）`,
      '',
      baseInfo,
      '',
      '支持起诉理由：',
      '经初步审查，申请人反映的劳动报酬权益受损事项属于支持起诉工作关注范围。现有材料显示，被申请人存在拖欠劳动报酬的可能，应依法保障劳动者合法权益。',
      '',
      '处理意见：',
      `建议依法支持${input.applicantName}就相关劳动报酬争议向人民法院提起民事诉讼，并继续补强劳动关系、欠薪金额和责任主体等证据材料。`,
      '',
      `承办人：${input.handlerName || '待填写'}`,
      new Date().toLocaleDateString('zh-CN'),
    ].join('\n');
  }

  private mockGenerateReport(caseData: any): string {
    return [
      '# 支持起诉案件初步分析报告',
      '',
      '## 一、案件概况',
      `案件编号：${caseData.caseNo || '待编号'}`,
      `申请人：${caseData.applicantName || '待核实'}`,
      `被申请人：${caseData.respondentName || '待核实'}`,
      `涉案金额：${Number(caseData.amount || 0).toLocaleString()}元`,
      `涉及人数：${caseData.personCount || 1}人`,
      '',
      '## 二、审查重点',
      '1. 核实劳动关系或实际用工关系。',
      '2. 核实欠薪期间、工资标准、已支付金额和剩余欠付金额。',
      '3. 核实施工总包、分包、劳务班组之间的责任链条。',
      '',
      '## 三、补证建议',
      '建议调取劳动合同、考勤表、工资表、银行流水、欠薪确认单及项目分包合同。',
      '',
      '## 四、风险提示',
      (caseData.personCount || 1) >= 30 ? '本案涉及人数较多，建议同步做好群体性风险预案。' : '本案风险整体可控，建议持续关注当事人动态。',
    ].join('\n');
  }

  private getDocTypeLabel(docType: string) {
    const labels: Record<string, string> = {
      support_prosecution: '支持起诉书',
      civil_complaint: '民事起诉状',
      civil_judgment: '民事判决书',
    };
    return labels[docType] || '法律文书';
  }
}
