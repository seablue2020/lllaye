import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const beijingClues = [
  ['CX-20260401-0001', '张伟', '北京城建劳务有限公司', '朝阳区望京商务楼宇装修项目', '北京市朝阳区望京街道广顺北大街18号', '朝阳区', 186000, 18, 'support_prosecution', 'hotline_12345', 'medium', true, '装修班组18名工人反映2025年11月至2026年1月工资未结清，多次讨要未果。'],
  ['CX-20260401-0002', '李建军', '北京城建劳务有限公司', '朝阳区望京商务楼宇装修项目', '北京市朝阳区望京街道广顺北大街18号', '朝阳区', 92000, 9, 'wage_complaint', 'frontend', 'low', false, '本人在望京装修项目从事木工，仍有工资92000元未支付。'],
  ['CX-20260402-0003', '王强', '北京华北建设集团有限公司', '海淀区中关村软件园配套工程', '北京市海淀区西北旺镇软件园二期', '海淀区', 680000, 42, 'support_prosecution', 'dept_share', 'high', true, '42名农民工在软件园配套工程施工，春节后仍被拖欠工资共68万元。'],
  ['CX-20260403-0004', '赵敏', '京西劳务服务有限公司', '西城区金融街办公楼改造项目', '北京市西城区金融街街道太平桥大街', '西城区', 54000, 6, 'support_prosecution', 'frontend', 'low', true, '保洁和拆改工人反映办公楼改造项目拖欠尾款和工资。'],
  ['CX-20260404-0005', '孙磊', '北京通运市政工程有限公司', '通州区副中心道路养护项目', '北京市通州区潞城镇运河东大街', '通州区', 360000, 28, 'support_prosecution', 'unit_transfer', 'medium', true, '道路养护项目多名工人未收到2025年第四季度工资。'],
  ['CX-20260405-0006', '周海', '北京丰科建筑装饰有限公司', '丰台区丽泽商务区精装修项目', '北京市丰台区丽泽金融商务区', '丰台区', 820000, 55, 'support_prosecution', 'hotline_12345', 'high', true, '55名装修工人被拖欠工资82万元，存在集体上访风险。'],
  ['CX-20260406-0007', '吴楠', '北京大兴机场临空劳务有限公司', '大兴区临空经济区厂房建设项目', '北京市大兴区礼贤镇临空经济区', '大兴区', 470000, 33, 'support_prosecution', 'dept_share', 'high', true, '临空经济区厂房项目33名钢筋工、架子工工资未结清。'],
  ['CX-20260407-0008', '郑涛', '北京昌平园林工程有限公司', '昌平区未来科学城景观提升项目', '北京市昌平区未来科学城路', '昌平区', 126000, 14, 'wage_complaint', 'frontend', 'medium', false, '园林绿化班组被拖欠两个月工资，涉及14人。'],
  ['CX-20260408-0009', '钱勇', '北京顺义物流园建设有限公司', '顺义区空港物流园仓储项目', '北京市顺义区后沙峪镇裕民大街', '顺义区', 610000, 38, 'support_prosecution', 'hotline_12345', 'high', true, '仓储项目停工后38名工人集中反映工资拖欠。'],
  ['CX-20260409-0010', '冯丽', '北京石景山物业服务有限公司', '石景山区老旧小区综合整治项目', '北京市石景山区八角街道', '石景山区', 78000, 11, 'wage_complaint', 'frontend', 'medium', false, '老旧小区整治项目保洁、搬运人员工资未结清。'],
  ['CX-20260410-0011', '陈刚', '北京房建基础工程有限公司', '房山区轨道交通配套土建项目', '北京市房山区良乡大学城西站周边', '房山区', 730000, 46, 'support_prosecution', 'unit_transfer', 'high', true, '轨道交通配套项目46名工人被拖欠工资，金额较大。'],
  ['CX-20260411-0012', '刘洋', '北京东城文保修缮有限公司', '东城区历史建筑修缮项目', '北京市东城区东四街道', '东城区', 64000, 7, 'support_prosecution', 'frontend', 'low', true, '历史建筑修缮项目泥瓦工反映劳务费迟迟未付。'],
  ['CX-20260412-0013', '许亮', '北京平谷农业设施建设有限公司', '平谷区农业科技园温室项目', '北京市平谷区马坊镇农业科技园', '平谷区', 210000, 19, 'support_prosecution', 'dept_share', 'medium', true, '温室建设项目工人反映工资和加班费未支付。'],
  ['CX-20260413-0014', '何军', '北京怀柔文旅工程有限公司', '怀柔区民宿集群改造项目', '北京市怀柔区雁栖镇', '怀柔区', 95000, 8, 'wage_complaint', 'frontend', 'low', false, '民宿改造项目瓦工班组尾款未结。'],
  ['CX-20260414-0015', '马峰', '北京密云水务建设有限公司', '密云区水库周边生态治理项目', '北京市密云区溪翁庄镇', '密云区', 330000, 24, 'support_prosecution', 'unit_transfer', 'medium', true, '生态治理项目24名工人反映工程款结算后工资仍未发放。'],
  ['CX-20260415-0016', '高鹏', '北京延庆冰雪工程服务有限公司', '延庆区冰雪场馆维护项目', '北京市延庆区张山营镇', '延庆区', 158000, 13, 'wage_complaint', 'frontend', 'medium', false, '场馆维护项目季节工工资被拖欠。'],
  ['CX-20260416-0017', '曹宇', '北京门头沟市政劳务有限公司', '门头沟区灾后道路修复项目', '北京市门头沟区龙泉镇', '门头沟区', 520000, 31, 'support_prosecution', 'hotline_12345', 'high', true, '灾后道路修复项目31名工人被拖欠工资52万元。'],
  ['CX-20260417-0018', '黄鑫', '北京中轴建设劳务有限公司', '东城区中轴线环境整治项目', '北京市东城区天坛街道', '东城区', 88000, 10, 'wage_complaint', 'frontend', 'medium', false, '环境整治项目小工工资结算存在争议。'],
  ['CX-20260428-0019', '梁博', '北京华北建设集团有限公司', '海淀区中关村软件园配套工程', '北京市海淀区西北旺镇软件园二期', '海淀区', 145000, 12, 'support_prosecution', 'frontend', 'medium', true, '同一项目新增班组反映工资未结清，疑似可并案处理。'],
  ['CX-20260429-0020', '蒋欣', '北京丰科建筑装饰有限公司', '丰台区丽泽商务区精装修项目', '北京市丰台区丽泽金融商务区', '丰台区', 260000, 21, 'support_prosecution', 'dept_share', 'medium', true, '丽泽项目另一班组反映分包单位未结工资。'],
  ['CX-20260430-0021', '罗凯', '北京通运市政工程有限公司', '通州区副中心道路养护项目', '北京市通州区潞城镇运河东大街', '通州区', 76000, 6, 'wage_complaint', 'frontend', 'low', false, '今日新增线索：道路养护项目小班组工资尾款未付。'],
  ['CX-20260430-0022', '潘越', '北京顺义物流园建设有限公司', '顺义区空港物流园仓储项目', '北京市顺义区后沙峪镇裕民大街', '顺义区', 118000, 10, 'support_prosecution', 'hotline_12345', 'medium', true, '今日新增线索：仓储项目安装班组工资未付。'],
] as const;

function dateFromClueNo(clueNo: string) {
  const raw = clueNo.split('-')[1];
  return new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T09:30:00+08:00`);
}

async function main() {
  console.log('Seeding Beijing wage-governance demo data...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const roles = [
    { id: 'role-admin', name: '系统管理员', code: 'admin', description: '拥有全部权限', permissions: ['*'] },
    { id: 'role-prosecutor', name: '承办检察官', code: 'prosecutor', description: '负责线索研判和案件办理', permissions: ['clue:*', 'case:*', 'document:*', 'review:*', 'batch:*'] },
    { id: 'role-dept-head', name: '部门负责人', code: 'dept_head', description: '负责文书审核', permissions: ['clue:*', 'case:*', 'document:approve', 'review:*'] },
    { id: 'role-deputy-chief', name: '分管副检察长', code: 'deputy_chief', description: '负责审批和督办', permissions: ['document:approve', 'case:approve'] },
    { id: 'role-auditor', name: '审计员', code: 'auditor', description: '查看审计日志', permissions: ['audit:read'] },
  ];

  for (const role of roles) {
    await prisma.role.upsert({ where: { code: role.code }, update: role, create: role });
  }

  const orgs = [
    { id: 'org-beijing', name: '北京市人民检察院', code: 'BJ_PROCURATORATE', type: 'city' },
    { id: 'org-beijing-first', name: '北京市人民检察院第一分院', code: 'BJ_BRANCH_1', type: 'bureau', parentId: 'org-beijing' },
    { id: 'org-xicheng', name: '北京市西城区人民检察院', code: 'BJ_XICHENG', type: 'district', parentId: 'org-beijing-first' },
  ];

  for (const org of orgs) {
    await prisma.org.upsert({ where: { code: org.code }, update: org, create: org });
  }

  const users = [
    { id: 'user-admin', username: 'admin', realName: '系统管理员', phone: '13800000000', roleId: 'role-admin' },
    { id: 'user-prosecutor', username: 'prosecutor', realName: '李检察官', phone: '13800000001', roleId: 'role-prosecutor' },
    { id: 'user-dept-head', username: 'dept_head', realName: '张主任', phone: '13800000002', roleId: 'role-dept-head' },
    { id: 'user-deputy', username: 'deputy_chief', realName: '王副检察长', phone: '13800000003', roleId: 'role-deputy-chief' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { ...user, password: hashedPassword, orgId: 'org-xicheng' },
      create: { ...user, password: hashedPassword, orgId: 'org-xicheng' },
    });
  }

  const dictionaries = [
    ['clue_status', 'pending_review', '待研判'],
    ['clue_status', 'triaged', '已分流'],
    ['clue_status', 'under_review', '审查中'],
    ['clue_status', 'closed', '已办结'],
    ['clue_status', 'rejected', '不予受理'],
    ['claim_type', 'support_prosecution', '支持起诉申请'],
    ['claim_type', 'wage_complaint', '欠薪投诉举报'],
    ['claim_type', 'legal_consult', '法律咨询'],
    ['clue_source', 'frontend', '前端填报'],
    ['clue_source', 'hotline_12345', '12345热线'],
    ['clue_source', 'dept_share', '部门共享'],
    ['clue_source', 'unit_transfer', '单位移送'],
    ['risk_level', 'high', '高风险'],
    ['risk_level', 'medium', '中风险'],
    ['risk_level', 'low', '低风险'],
  ];

  for (let i = 0; i < dictionaries.length; i += 1) {
    const [type, code, label] = dictionaries[i];
    await prisma.dictionary.upsert({
      where: { type_code: { type, code } },
      update: { type, code, label, value: code, sortOrder: i + 1, status: 'active' },
      create: { type, code, label, value: code, sortOrder: i + 1, status: 'active' },
    });
  }

  for (let index = 0; index < beijingClues.length; index += 1) {
    const [clueNo, applicantName, subjectName, projectName, projectAddress, district, amount, personCount, claimType, source, riskLevel, isKey, claimOriginal] = beijingClues[index];
    const createdAt = dateFromClueNo(clueNo);
    await prisma.clue.upsert({
      where: { clueNo },
      update: {
        applicantName,
        subjectType: '企业',
        subjectName,
        projectName,
        projectAddress,
        projectAddressStd: { province: '北京市', city: '北京市', district, project: projectName },
        amount,
        personCount,
        claimType,
        claimOriginal,
        source,
        status: index % 7 === 5 ? 'under_review' : 'pending_review',
        riskLevel,
        riskReason: riskLevel === 'high' ? '涉及人数较多; 涉案金额较大; 存在群体性风险' : riskLevel === 'medium' ? '人数或金额达到重点关注阈值' : '常规线索',
        isKey,
        createdAt,
      },
      create: {
        clueNo,
        applicantName,
        applicantIdNo: `11010119${String(800000 + index).padStart(6, '0')}`,
        applicantIdNoMasked: `110101****${String(1000 + index)}`,
        phone: `1380000${String(1000 + index)}`,
        phoneMasked: `138****${String(1000 + index)}`,
        subjectType: '企业',
        subjectName,
        subjectIdNo: `911101${String(1000000000 + index)}`,
        subjectContact: `010-6${String(1000000 + index)}`,
        projectName,
        projectAddress,
        projectAddressStd: { province: '北京市', city: '北京市', district, project: projectName },
        amount,
        personCount,
        claimType,
        claimOriginal,
        source,
        status: index % 7 === 5 ? 'under_review' : 'pending_review',
        riskLevel,
        riskReason: riskLevel === 'high' ? '涉及人数较多; 涉案金额较大; 存在群体性风险' : riskLevel === 'medium' ? '人数或金额达到重点关注阈值' : '常规线索',
        isKey,
        createdAt,
      },
    });
  }

  const createdClues = await prisma.clue.findMany({
    where: { clueNo: { in: beijingClues.map((item) => item[0]) } },
    select: { id: true, clueNo: true, applicantName: true, applicantIdNo: true, phone: true, subjectName: true, projectName: true, amount: true, personCount: true, claimOriginal: true, createdAt: true, riskLevel: true },
  });
  const clueByNo = new Map(createdClues.map((item) => [item.clueNo, item]));

  const caseClueNos = ['CX-20260402-0003', 'CX-20260405-0006', 'CX-20260406-0007', 'CX-20260408-0009', 'CX-20260410-0011', 'CX-20260416-0017', 'CX-20260428-0019', 'CX-20260429-0020', 'CX-20260430-0022'];
  for (let index = 0; index < caseClueNos.length; index += 1) {
    const clue = clueByNo.get(caseClueNos[index])!;
    const caseNo = `AJ-202604${String(index + 1).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`;
    await prisma.case.upsert({
      where: { caseNo },
      update: {
        clueId: clue.id,
        title: `${clue.applicantName}诉${clue.subjectName}欠薪支持起诉案`,
        description: clue.claimOriginal,
        applicantName: clue.applicantName,
        applicantIdNo: clue.applicantIdNo,
        applicantPhone: clue.phone,
        respondentName: clue.subjectName,
        amount: clue.amount,
        personCount: clue.personCount,
        status: index === 1 ? 'closed' : 'under_review',
        reviewConclusion: index === 1 ? 'accepted' : null,
        filedAt: clue.createdAt,
        handlerId: 'user-prosecutor',
        handlerName: '李检察官',
      },
      create: {
        caseNo,
        clueId: clue.id,
        title: `${clue.applicantName}诉${clue.subjectName}欠薪支持起诉案`,
        description: clue.claimOriginal,
        applicantName: clue.applicantName,
        applicantIdNo: clue.applicantIdNo,
        applicantPhone: clue.phone,
        respondentName: clue.subjectName,
        amount: clue.amount,
        personCount: clue.personCount,
        status: index === 1 ? 'closed' : 'under_review',
        reviewConclusion: index === 1 ? 'accepted' : null,
        filedAt: clue.createdAt,
        handlerId: 'user-prosecutor',
        handlerName: '李检察官',
      },
    });
  }

  const taskClueNos = ['CX-20260402-0003', 'CX-20260405-0006', 'CX-20260406-0007', 'CX-20260408-0009', 'CX-20260410-0011', 'CX-20260417-0018', 'CX-20260430-0022'];
  for (const clueNo of taskClueNos) {
    const clue = clueByNo.get(clueNo)!;
    const task = {
      id: `task-${clueNo}`,
      type: 'clue_review',
      title: clue.riskLevel === 'high' ? `【高风险预警】${clueNo} 欠薪线索` : `支持起诉审查 - ${clueNo}`,
      description: `${clue.projectName}，涉及${clue.personCount}人，金额${Number(clue.amount || 0).toLocaleString()}元。`,
      bizId: clue.id,
      bizType: 'clue',
      assigneeId: 'user-prosecutor',
      assigneeName: '李检察官',
      assignerId: 'user-admin',
      assignerName: '系统管理员',
      status: 'pending',
      priority: clue.riskLevel === 'high' ? 'urgent' : 'high',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    };
    await prisma.task.upsert({ where: { id: task.id }, update: task, create: task });
  }

  console.log('Beijing demo data seeded. Login: admin/123456');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
