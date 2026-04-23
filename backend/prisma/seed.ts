import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 创建角色
  const roles = [
    {
      id: 'role-admin',
      name: '系统管理员',
      code: 'admin',
      description: '系统管理员，拥有所有权限',
      permissions: ['*'],
    },
    {
      id: 'role-prosecutor',
      name: '承办检察官',
      code: 'prosecutor',
      description: '承办检察官，负责案件办理',
      permissions: ['clue:*', 'case:*', 'document:*', 'review:*', 'batch:*'],
    },
    {
      id: 'role-dept-head',
      name: '部门负责人',
      code: 'dept_head',
      description: '部门负责人，负责文书审核',
      permissions: ['clue:*', 'case:*', 'document:approve', 'review:*'],
    },
    {
      id: 'role-deputy-chief',
      name: '分管副检察长',
      code: 'deputy_chief',
      description: '分管副检察长，负责审批',
      permissions: ['document:approve', 'case:approve'],
    },
    {
      id: 'role-auditor',
      name: '审计员',
      code: 'auditor',
      description: '审计员，负责查看审计日志',
      permissions: ['audit:read'],
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }
  console.log('Roles created');

  // 创建机构
  const orgs = [
    { id: 'org-provincial', name: '省人民检察院', code: 'PROVINCIAL', type: 'province' },
    { id: 'org-city', name: '市人民检察院', code: 'CITY', type: 'city', parentId: 'org-provincial' },
    { id: 'org-district', name: '区人民检察院', code: 'DISTRICT', type: 'district', parentId: 'org-city' },
  ];

  for (const org of orgs) {
    await prisma.org.upsert({
      where: { code: org.code },
      update: org,
      create: org,
    });
  }
  console.log('Orgs created');

  // 创建用户
  const hashedPassword = await bcrypt.hash('123456', 10);
  const users = [
    {
      id: 'user-admin',
      username: 'admin',
      password: hashedPassword,
      realName: '系统管理员',
      phone: '13800000000',
      roleId: 'role-admin',
      orgId: 'org-district',
    },
    {
      id: 'user-prosecutor',
      username: 'prosecutor',
      password: hashedPassword,
      realName: '李检察官',
      phone: '13800000001',
      roleId: 'role-prosecutor',
      orgId: 'org-district',
    },
    {
      id: 'user-dept-head',
      username: 'dept_head',
      password: hashedPassword,
      realName: '张主任',
      phone: '13800000002',
      roleId: 'role-dept-head',
      orgId: 'org-district',
    },
    {
      id: 'user-deputy',
      username: 'deputy_chief',
      password: hashedPassword,
      realName: '王副检察长',
      phone: '13800000003',
      roleId: 'role-deputy-chief',
      orgId: 'org-district',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: user,
      create: user,
    });
  }
  console.log('Users created');

  // 创建字典数据
  const dictionaries = [
    // 线索状态
    { type: 'clue_status', code: 'pending_review', label: '待研判', value: 'pending_review', sortOrder: 1 },
    { type: 'clue_status', code: 'triaged', label: '已分流', value: 'triaged', sortOrder: 2 },
    { type: 'clue_status', code: 'under_review', label: '待审查', value: 'under_review', sortOrder: 3 },
    { type: 'clue_status', code: 'closed', label: '已办结', value: 'closed', sortOrder: 4 },
    { type: 'clue_status', code: 'rejected', label: '不予受理', value: 'rejected', sortOrder: 5 },
    // 诉求类型
    { type: 'claim_type', code: 'support_prosecution', label: '支持起诉申请', value: 'support_prosecution', sortOrder: 1 },
    { type: 'claim_type', code: 'wage_complaint', label: '欠薪投诉举报', value: 'wage_complaint', sortOrder: 2 },
    { type: 'claim_type', code: 'legal_consult', label: '法律咨询', value: 'legal_consult', sortOrder: 3 },
    // 线索来源
    { type: 'clue_source', code: 'frontend', label: '前端自主填报', value: 'frontend', sortOrder: 1 },
    { type: 'clue_source', code: 'hotline_12345', label: '12345热线', value: 'hotline_12345', sortOrder: 2 },
    { type: 'clue_source', code: 'dept_share', label: '部门共享', value: 'dept_share', sortOrder: 3 },
    { type: 'clue_source', code: 'unit_transfer', label: '单位移送', value: 'unit_transfer', sortOrder: 4 },
    // 风险等级
    { type: 'risk_level', code: 'high', label: '高风险', value: 'high', sortOrder: 1 },
    { type: 'risk_level', code: 'medium', label: '中风险', value: 'medium', sortOrder: 2 },
    { type: 'risk_level', code: 'low', label: '低风险', value: 'low', sortOrder: 3 },
    // 文书类型
    { type: 'doc_type', code: 'support_letter', label: '支持起诉意见书', value: 'support_letter', sortOrder: 1 },
    { type: 'doc_type', code: 'inquiry_record', label: '询问笔录', value: 'inquiry_record', sortOrder: 2 },
    { type: 'doc_type', code: 'evidence_list', label: '证据目录', value: 'evidence_list', sortOrder: 3 },
    { type: 'doc_type', code: 'service_receipt', label: '送达回证', value: 'service_receipt', sortOrder: 4 },
    { type: 'doc_type', code: 'case_report', label: '案件审结报告', value: 'case_report', sortOrder: 5 },
  ];

  for (const dict of dictionaries) {
    await prisma.dictionary.upsert({
      where: { type_code: { type: dict.type, code: dict.code } },
      update: dict,
      create: dict,
    });
  }
  console.log('Dictionaries created');

  // 创建文书模板
  const templates = [
    {
      id: 'tpl-support-letter',
      name: '支持起诉申请书（AI生成参考版）',
      code: 'SUPPORT_LETTER',
      docType: 'support_letter',
      category: '支持起诉核心文书',
      content: `# 支持起诉意见书

案号：{{caseNo}}

申请人：{{applicantName}}
被申请人：{{respondentName}}

一、案件基本情况
申请人因被申请人拖欠劳动报酬，特向检察机关申请支持起诉。

二、事实与理由
{{claimContent}}

三、证据情况
{{evidenceSummary}}

四、法律依据
1. 《中华人民共和国民法典》第五百零九条
2. 《保障农民工工资支付条例》第三条
3. 《中华人民共和国民事诉讼法》第一百二十二条

五、审查意见
经审查，申请人申请符合法律规定，建议支持起诉。

六、建议
建议本院依法向人民法院提出支持起诉意见。

                           承办检察官：{{handlerName}}
                           {{date}}
`,
      variables: ['caseNo', 'applicantName', 'respondentName', 'claimContent', 'evidenceSummary', 'handlerName', 'date'],
    },
    {
      id: 'tpl-inquiry-record',
      name: '询问笔录模板',
      code: 'INQUIRY_RECORD',
      docType: 'inquiry_record',
      category: '调查取证文书',
      content: `# 询问笔录

案号：{{caseNo}}
时间：{{time}}
地点：{{location}}
询问人：{{interviewer}}
记录人：{{recorder}}
被询问人：{{interviewee}}

问：请陈述你的基本情况
答：

问：请陈述你的工作经历
答：

问：请陈述被欠薪的情况
答：

问：你有什么证据证明上述事实？
答：

询问人签名：____________
记录人签名：____________
被询问人签名：____________
`,
      variables: ['caseNo', 'time', 'location', 'interviewer', 'recorder', 'interviewee'],
    },
    {
      id: 'tpl-evidence-list',
      name: '证据目录模板',
      code: 'EVIDENCE_LIST',
      docType: 'evidence_list',
      category: '调查取证文书',
      content: `# 证据目录

案号：{{caseNo}}
序号 | 证据名称 | 证据类型 | 证明内容 | 页数
---- | -------- | -------- | -------- | ----
{{evidenceRows}}
`,
      variables: ['caseNo', 'evidenceRows'],
    },
  ];

  for (const tpl of templates) {
    await prisma.documentTemplate.upsert({
      where: { code: tpl.code },
      update: tpl,
      create: tpl,
    });
  }
  console.log('Document templates created');

  // 创建示例线索数据
  const clueData = [
    {
      clueNo: 'CX-20260401-0001',
      applicantName: '张三',
      applicantIdNo: '110101199001011234',
      applicantIdNoMasked: '1101****5234',
      phone: '13812345678',
      phoneMasked: '138****5678',
      subjectType: '企业',
      subjectName: '某某建筑有限公司',
      subjectIdNo: '91110000MA01ABCD12',
      projectName: '某某花园一期工地',
      projectAddress: '北京市朝阳区某某路88号',
      projectAddressStd: { province: '北京', city: '北京市', district: '朝阳区', street: '某某街道', road: '某某路', project: '某某花园一期' },
      amount: 50000,
      personCount: 5,
      claimType: 'support_prosecution',
      claimOriginal: '包工头欠我钱一直拖咋办',
      source: 'frontend',
      status: 'pending_review',
      riskLevel: 'medium',
      isKey: true,
    },
    {
      clueNo: 'CX-20260401-0002',
      applicantName: '李四',
      applicantIdNo: '110101199002022345',
      applicantIdNoMasked: '1101****2345',
      phone: '13923456789',
      phoneMasked: '139****6789',
      subjectType: '企业',
      subjectName: '某某建筑有限公司',
      subjectIdNo: '91110000MA01ABCD12',
      projectName: '某某花园一期工地',
      projectAddress: '北京市朝阳区某某路88号',
      projectAddressStd: { province: '北京', city: '北京市', district: '朝阳区', street: '某某街道', road: '某某路', project: '某某花园一期' },
      amount: 35000,
      personCount: 1,
      claimType: 'wage_complaint',
      claimOriginal: '我是钢筋工，包工头欠我35000元工资，多次催要都不给',
      source: 'frontend',
      status: 'pending_review',
      riskLevel: 'low',
      isKey: false,
    },
    {
      clueNo: 'CX-20260402-0003',
      applicantName: '王五',
      applicantIdNo: '110101199003033456',
      applicantIdNoMasked: '1101****3456',
      phone: '13734567890',
      phoneMasked: '137****7890',
      subjectType: '包工头',
      subjectName: '赵某某',
      projectName: '某某新城项目',
      projectAddress: '北京市海淀区某某大街100号',
      projectAddressStd: { province: '北京', city: '北京市', district: '海淀区', street: '某某街道', road: '某某大街', project: '某某新城' },
      amount: 200000,
      personCount: 35,
      claimType: 'support_prosecution',
      claimOriginal: '我们35个农民工被包工头赵某某拖欠工资共计20万元，请检察机关支持起诉',
      source: 'hotline_12345',
      status: 'pending_review',
      riskLevel: 'high',
      riskReason: '涉及人数≥30，存在群体性风险',
      isKey: true,
    },
  ];

  for (const clue of clueData) {
    await prisma.clue.upsert({
      where: { clueNo: clue.clueNo },
      update: clue,
      create: clue,
    });
  }
  console.log('Sample clues created');

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
