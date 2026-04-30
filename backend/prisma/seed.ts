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
    {
      clueNo: 'CX-20260410-0004',
      applicantName: '赵六',
      applicantIdNo: '310101199104044567',
      applicantIdNoMasked: '3101****4567',
      phone: '13656789012',
      phoneMasked: '136****9012',
      subjectType: '企业',
      subjectName: '东方建设集团',
      subjectIdNo: '91310000MA1FABCD34',
      projectName: '浦东新区某某商业中心',
      projectAddress: '上海市浦东新区陆家嘴环路200号',
      projectAddressStd: { province: '上海', city: '上海市', district: '浦东新区', street: '陆家嘴街道', road: '陆家嘴环路', project: '某某商业中心' },
      amount: 850000,
      personCount: 60,
      claimType: 'support_prosecution',
      claimOriginal: '我们60名工人被东方建设集团拖欠工资85万元，多次讨要无果',
      source: 'dept_share',
      status: 'pending_review',
      riskLevel: 'high',
      riskReason: '涉及人数≥30，存在群体性风险;涉案金额较大',
      isKey: true,
    },
    {
      clueNo: 'CX-20260411-0005',
      applicantName: '钱七',
      applicantIdNo: '310101199205055678',
      applicantIdNoMasked: '3101****5678',
      phone: '13567890123',
      phoneMasked: '135****0123',
      subjectType: '企业',
      subjectName: '东方建设集团',
      subjectIdNo: '91310000MA1FABCD34',
      projectName: '浦东新区某某商业中心',
      projectAddress: '上海市浦东新区陆家嘴环路200号',
      projectAddressStd: { province: '上海', city: '上海市', district: '浦东新区', street: '陆家嘴街道', road: '陆家嘴环路', project: '某某商业中心' },
      amount: 120000,
      personCount: 12,
      claimType: 'wage_complaint',
      claimOriginal: '我是木工，跟东方建设集团做分包，欠我12万工资',
      source: 'frontend',
      status: 'pending_review',
      riskLevel: 'medium',
      isKey: false,
    },
    {
      clueNo: 'CX-20260412-0006',
      applicantName: '孙八',
      applicantIdNo: '440103199306066789',
      applicantIdNoMasked: '4401****6789',
      phone: '13478901234',
      phoneMasked: '134****1234',
      subjectType: '企业',
      subjectName: '南粤劳务公司',
      subjectIdNo: '91440100MA5ABCD567',
      projectName: '天河区某某科技园',
      projectAddress: '广州市天河区中山大道西888号',
      projectAddressStd: { province: '广东', city: '广州市', district: '天河区', street: '棠下街道', road: '中山大道西', project: '某某科技园' },
      amount: 300000,
      personCount: 25,
      claimType: 'support_prosecution',
      claimOriginal: '南粤劳务公司拖欠25名工人工资共计30万元',
      source: 'hotline_12345',
      status: 'pending_review',
      riskLevel: 'medium',
      isKey: true,
    },
    {
      clueNo: 'CX-20260413-0007',
      applicantName: '周九',
      applicantIdNo: '510107199407077890',
      applicantIdNoMasked: '5101****7890',
      phone: '13389012345',
      phoneMasked: '133****2345',
      subjectType: '企业',
      subjectName: '天府建筑工程有限公司',
      subjectIdNo: '91510000MA6ABCDE78',
      projectName: '高新区某某产业园',
      projectAddress: '成都市高新区天府大道中段666号',
      projectAddressStd: { province: '四川', city: '成都市', district: '高新区', street: '中和街道', road: '天府大道中段', project: '某某产业园' },
      amount: 150000,
      personCount: 18,
      claimType: 'support_prosecution',
      claimOriginal: '天府建筑拖欠18名工人工资15万元，请检察机关支持起诉',
      source: 'unit_transfer',
      status: 'pending_review',
      riskLevel: 'medium',
      isKey: true,
    },
    {
      clueNo: 'CX-20260414-0008',
      applicantName: '吴十',
      applicantIdNo: '320102199508088901',
      applicantIdNoMasked: '3201****8901',
      phone: '13290123456',
      phoneMasked: '132****3456',
      subjectType: '包工头',
      subjectName: '郑某某',
      projectName: '建邺区某某安置房小区',
      projectAddress: '南京市建邺区应天大街999号',
      projectAddressStd: { province: '江苏', city: '南京市', district: '建邺区', street: '兴隆街道', road: '应天大街', project: '某某安置房小区' },
      amount: 95000,
      personCount: 8,
      claimType: 'wage_complaint',
      claimOriginal: '包工头郑某某拖欠8名工人工资共计95000元',
      source: 'frontend',
      status: 'pending_review',
      riskLevel: 'low',
      isKey: false,
    },
    {
      clueNo: 'CX-20260415-0009',
      applicantName: '郑十一',
      applicantIdNo: '330102199609099012',
      applicantIdNoMasked: '3301****9012',
      phone: '13101234567',
      phoneMasked: '131****4567',
      subjectType: '企业',
      subjectName: '钱塘江建设集团',
      subjectIdNo: '91330000MA2ABCD123',
      projectName: '滨江区某某数字经济产业园',
      projectAddress: '杭州市滨江区江南大道1000号',
      projectAddressStd: { province: '浙江', city: '杭州市', district: '滨江区', street: '长河街道', road: '江南大道', project: '某某数字经济产业园' },
      amount: 420000,
      personCount: 40,
      claimType: 'support_prosecution',
      claimOriginal: '钱塘江建设集团拖欠40名工人工资42万元，涉及人数众多',
      source: 'hotline_12345',
      status: 'pending_review',
      riskLevel: 'high',
      riskReason: '涉及人数≥30，存在群体性风险',
      isKey: true,
    },
    {
      clueNo: 'CX-20260416-0010',
      applicantName: '冯十二',
      applicantIdNo: '370102199710101123',
      applicantIdNoMasked: '3701****1123',
      phone: '13012345678',
      phoneMasked: '130****5678',
      subjectType: '企业',
      subjectName: '泉城建筑公司',
      subjectIdNo: '91370100MA3DEF456',
      projectName: '历下区某某旧城改造项目',
      projectAddress: '济南市历下区泉城路168号',
      projectAddressStd: { province: '山东', city: '济南市', district: '历下区', street: '泉城路街道', road: '泉城路', project: '某某旧城改造项目' },
      amount: 180000,
      personCount: 15,
      claimType: 'wage_complaint',
      claimOriginal: '泉城建筑拖欠15名工人工资18万元',
      source: 'dept_share',
      status: 'pending_review',
      riskLevel: 'medium',
      isKey: false,
    },
    {
      clueNo: 'CX-20260417-0011',
      applicantName: '陈十三',
      applicantIdNo: '420102199811111234',
      applicantIdNoMasked: '4201****1234',
      phone: '13923456780',
      phoneMasked: '139****6780',
      subjectType: '企业',
      subjectName: '长江劳务派遣公司',
      subjectIdNo: '91420100MA4GHIJ789',
      projectName: '武昌区某某还建房项目',
      projectAddress: '武汉市武昌区中南路100号',
      projectAddressStd: { province: '湖北', city: '武汉市', district: '武昌区', street: '中南路街道', road: '中南路', project: '某某还建房项目' },
      amount: 220000,
      personCount: 22,
      claimType: 'support_prosecution',
      claimOriginal: '长江劳务拖欠22名工人工资共计22万元',
      source: 'unit_transfer',
      status: 'pending_review',
      riskLevel: 'medium',
      isKey: true,
    },
    {
      clueNo: 'CX-20260418-0012',
      applicantName: '褚十四',
      applicantIdNo: '210102199912121345',
      applicantIdNoMasked: '2101****1345',
      phone: '13834567890',
      phoneMasked: '138****7890',
      subjectType: '企业',
      subjectName: '东北建设有限公司',
      subjectIdNo: '91210000MA5JKLM890',
      projectName: '和平区某某地铁配套工程',
      projectAddress: '沈阳市和平区太原街88号',
      projectAddressStd: { province: '辽宁', city: '沈阳市', district: '和平区', street: '太原街街道', road: '太原街', project: '某某地铁配套工程' },
      amount: 130000,
      personCount: 10,
      claimType: 'wage_complaint',
      claimOriginal: '东北建设拖欠10名工人工资13万元',
      source: 'frontend',
      status: 'pending_review',
      riskLevel: 'medium',
      isKey: false,
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

  // 获取已创建的线索（用于关联任务）
  const createdClues = await prisma.clue.findMany({
    where: { clueNo: { in: clueData.map(c => c.clueNo) } },
    select: { id: true, clueNo: true, isKey: true, claimType: true },
  });

  // 创建任务数据（bizId 仅关联真实存在的 Clue 记录，避免外键约束错误）
  const now = new Date();
  const taskData = [
    // 线索研判类任务（assignee: prosecutor）
    {
      type: 'clue_review',
      title: '【重点线索】需要支持起诉审查 - CX-20260401-0001',
      description: '申请人勾选了"需要支持起诉"，请及时处理',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260401-0001')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'clue_review',
      title: '【高风险预警】群体性欠薪案件 - CX-20260402-0003',
      description: '涉及35人，金额20万元，需优先处理',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260402-0003')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'urgent',
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'clue_review',
      title: '支持起诉审查 - CX-20260410-0004',
      description: '涉及60人，金额85万元的大型群体性欠薪案件',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260410-0004')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'urgent',
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'clue_review',
      title: '支持起诉审查 - CX-20260413-0007',
      description: '四川地区欠薪案件，需及时研判',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260413-0007')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'clue_review',
      title: '【高风险预警】群体性欠薪案件 - CX-20260415-0009',
      description: '浙江地区，涉及40人，金额42万元，需优先处理',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260415-0009')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'urgent',
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'clue_review',
      title: '线索研判 - CX-20260412-0006',
      description: '天河区某科技园欠薪案件，需调查核实',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260412-0006')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'in_progress',
      priority: 'normal',
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'clue_review',
      title: '线索研判 - CX-20260417-0011',
      description: '武昌区某还建房项目欠薪案件',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260417-0011')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'clue_review',
      title: '线索研判 - CX-20260416-0010',
      description: '济南某旧城改造项目欠薪案件',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260416-0010')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'normal',
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
    },
    // 督办类任务（assignee: deputy_chief）
    {
      type: 'supervision',
      title: '【督办】高风险群体性欠薪案件',
      description: '涉及60人的大型群体性欠薪案件，请关注处置进展',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260410-0004')!.id,
      bizType: 'clue',
      assigneeId: 'user-deputy',
      assigneeName: '王副检察长',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: 'urgent',
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    // 已完成的任务（展示历史记录）
    {
      type: 'clue_review',
      title: '线索研判已完成 - CX-20260418-0012',
      description: '沈阳某地铁配套工程欠薪案件已完成研判',
      bizId: createdClues.find(c => c.clueNo === 'CX-20260418-0012')!.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'completed',
      priority: 'normal',
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const task of taskData) {
    const taskId = `${task.bizType}-${task.bizId.substring(0, 8)}-${task.type}`;
    await prisma.task.upsert({
      where: { id: taskId },
      update: task,
      create: { ...task, id: taskId },
    });
  }
  console.log('Sample tasks created');

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
