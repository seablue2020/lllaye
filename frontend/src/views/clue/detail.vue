<template>
  <div class="clue-detail-page page-container" v-loading="loading">
    <template v-if="clue">
      <!-- 页面头部 -->
      <div class="page-header">
        <div>
          <el-button text @click="router.push('/clue')">
            <el-icon><ArrowLeft /></el-icon>返回
          </el-button>
          <span class="page-title">{{ clue.clueNo }}</span>
          <el-tag :type="getStatusTag(clue.status)">{{ getStatusLabel(clue.status) }}</el-tag>
          <el-tag v-if="clue.isKey" type="danger">重点线索</el-tag>
          <el-tag v-if="clue.isAggregated" type="primary">聚合线索</el-tag>
        </div>
        <div class="btn-group">
          <el-button v-if="clue.status === 'pending_review'" type="warning" @click="showTriageDialog = true">分流处理</el-button>
          <el-button v-if="clue.status === 'under_review'" type="success" @click="router.push(`/review/${clue.id}`)">AI审查</el-button>
          <el-button @click="handleExport">导出</el-button>
        </div>
      </div>

      <!-- 线索基本信息 -->
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <div class="info-section">
            <div class="section-title">申请人信息</div>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="姓名">{{ clue.applicantName }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ clue.applicantIdNoMasked || clue.applicantIdNo }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ clue.phoneMasked || clue.phone }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="info-section">
            <div class="section-title">涉事主体信息</div>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="主体类型">{{ clue.subjectType }}</el-descriptions-item>
              <el-descriptions-item label="主体名称" :span="2">{{ clue.subjectName }}</el-descriptions-item>
              <el-descriptions-item label="证件号码">{{ clue.subjectIdNo || '—' }}</el-descriptions-item>
              <el-descriptions-item label="联系方式">{{ clue.subjectContact || '—' }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="info-section">
            <div class="section-title">项目/工地信息</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="项目名称" :span="2">{{ clue.projectName }}</el-descriptions-item>
              <el-descriptions-item label="项目地址" :span="2">{{ clue.projectAddress }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="info-section">
            <div class="section-title">诉求信息</div>
            <el-descriptions :column="4" border>
              <el-descriptions-item label="诉求类型">{{ getClaimTypeLabel(clue.claimType) }}</el-descriptions-item>
              <el-descriptions-item label="欠薪金额">¥{{ Number(clue.amount || 0).toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="涉及人数">{{ clue.personCount }} 人</el-descriptions-item>
              <el-descriptions-item label="线索来源">{{ getSourceLabel(clue.source) }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="info-section">
            <div class="section-title">诉求原文</div>
            <div class="claim-content">{{ clue.claimOriginal }}</div>
            <div v-if="clue.claimPolished" class="claim-polished">
              <div class="section-title" style="margin-top: 12px">润色后诉求</div>
              <div class="claim-polished-content">{{ clue.claimPolished }}</div>
            </div>
            <div style="margin-top: 12px">
              <el-button type="primary" plain size="small" @click="handlePolish">
                <el-icon><MagicStick /></el-icon>一键润色
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="证据材料" name="evidence">
          <div class="evidence-list">
            <div v-if="!clue.evidence?.length" class="empty-state">
              <p>暂无证据材料</p>
            </div>
            <div v-for="item in clue.evidence" :key="item.id" class="evidence-item">
              <el-icon :size="32" color="#666"><Document /></el-icon>
              <div class="evidence-info">
                <div class="evidence-name">{{ item.fileName }}</div>
                <div class="evidence-meta">{{ item.fileType }} · {{ item.fileSize }} · {{ dayjs(item.uploadedAt).format('YYYY-MM-DD') }}</div>
              </div>
              <el-tag size="small" :type="getEvidenceStatusTag(item.reviewStatus)">
                {{ getEvidenceStatus(item.reviewStatus) }}
              </el-tag>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="AI预分析" name="ai">
          <div v-if="clue.aiPreAnalysis" class="ai-analysis">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="风险等级">
                <el-tag :type="clue.riskLevel === 'high' ? 'danger' : clue.riskLevel === 'medium' ? 'warning' : 'success'" size="small">
                  {{ clue.riskLevel === 'high' ? '高风险' : clue.riskLevel === 'medium' ? '中风险' : '低风险' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="风险原因">{{ clue.riskReason || '无' }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="clue.aiPreAnalysis?.riskReasons?.length" style="margin-top: 16px">
              <div class="section-title">风险预警</div>
              <ul>
                <li v-for="(reason, i) in clue.aiPreAnalysis.riskReasons" :key="i" class="risk-item">{{ reason }}</li>
              </ul>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>暂无AI预分析结果</p>
          </div>
        </el-tab-pane>

        <el-tab-pane label="流程时间轴" name="timeline">
          <div class="timeline">
            <el-timeline>
              <el-timeline-item
                v-for="(record, index) in timeline"
                :key="index"
                :timestamp="dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')"
                :type="record.status === 'completed' ? 'success' : 'primary'"
              >
                <div class="timeline-content">
                  <div class="timeline-action">{{ record.action }}</div>
                  <div v-if="record.operatorName" class="timeline-operator">操作人：{{ record.operatorName }}</div>
                  <div v-if="record.opinion" class="timeline-opinion">{{ record.opinion }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-tab-pane>

        <el-tab-pane label="重复诉求" name="duplicate">
          <div v-if="duplicates.length" class="duplicate-list">
            <el-alert type="warning" :closable="false" show-icon>
              发现 {{ duplicates.length }} 条疑似重复诉求
            </el-alert>
            <el-table :data="duplicates" stripe style="margin-top: 16px">
              <el-table-column prop="clueNo" label="线索编号" width="160" />
              <el-table-column prop="applicantName" label="提交人" width="100" />
              <el-table-column prop="projectName" label="项目" min-width="160" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag size="small">{{ getStatusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="提交时间" width="160">
                <template #default="{ row }">
                  {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else class="empty-state">
            <p>未发现重复诉求</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <!-- 分流对话框 -->
    <el-dialog v-model="showTriageDialog" title="分流处理" width="500px">
      <el-form :model="triageForm" label-width="100px">
        <el-form-item label="分流操作">
          <el-radio-group v-model="triageForm.action">
            <el-radio value="accept">受理</el-radio>
            <el-radio value="reject">不予受理</el-radio>
            <el-radio value="transfer">移送</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="triageForm.action === 'reject'" label="不予受理原因">
          <el-input v-model="triageForm.rejectionReason" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="分流意见">
          <el-input v-model="triageForm.opinion" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTriageDialog = false">取消</el-button>
        <el-button type="primary" @click="handleTriageSubmit">确认分流</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clueApi, aiApi } from '@/api'
import { ElMessage } from 'element-plus'
import { ArrowLeft, MagicStick, Document } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const activeTab = ref('basic')
const clue = ref<any>(null)
const timeline = ref<any[]>([])
const duplicates = ref<any[]>([])
const showTriageDialog = ref(false)

const triageForm = reactive({
  action: 'accept',
  opinion: '',
  rejectionReason: '',
})

const claimTypeMap: Record<string, string> = {
  support_prosecution: '支持起诉',
  wage_complaint: '欠薪投诉',
  legal_consult: '法律咨询',
  other: '其他',
}

const statusMap: Record<string, string> = {
  pending_review: '待研判', triaged: '已分流', under_review: '待审查',
  investigating: '调查中', document_review: '文书审核', closed: '已办结', rejected: '不予受理',
}

const sourceMap: Record<string, string> = {
  frontend: '前端填报', hotline_12345: '12345热线', dept_share: '部门共享', unit_transfer: '单位移送',
}

function getClaimTypeLabel(type: string) { return claimTypeMap[type] || type }
function getStatusLabel(status: string) { return statusMap[status] || status }
function getSourceLabel(source: string) { return sourceMap[source] || source }
function getStatusTag(status: string) {
  if (status === 'pending_review') return 'warning'
  if (status === 'under_review') return 'primary'
  if (status === 'closed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}
function getEvidenceStatus(status: string) {
  if (status === 'reviewed') return '已审查'
  if (status === 'defective') return '有瑕疵'
  return '待审查'
}
function getEvidenceStatusTag(status: string) {
  if (status === 'reviewed') return 'success'
  if (status === 'defective') return 'warning'
  return 'info'
}

async function loadData() {
  const id = route.params.id as string
  loading.value = true
  try {
    const [clueData, timelineData, dupData] = await Promise.all([
      clueApi.getById(id),
      clueApi.getTimeline(id),
      clueApi.getDuplicates(id),
    ])
    clue.value = clueData
    timeline.value = timelineData.records
    duplicates.value = dupData
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function handlePolish() {
  if (!clue.value) return
  try {
    const res: any = await aiApi.polishClaim(clue.value.claimOriginal)
    clue.value.claimPolished = res.result || res
    ElMessage.success('润色完成')
  } catch (e) {
    ElMessage.error('润色失败')
  }
}

async function handleTriageSubmit() {
  if (!clue.value) return
  try {
    await clueApi.triage(clue.value.id, triageForm)
    ElMessage.success('分流成功')
    showTriageDialog.value = false
    loadData()
  } catch (e) {
    ElMessage.error('分流失败')
  }
}

function handleExport() {
  ElMessage.info('导出功能开发中')
}

onMounted(() => { loadData() })
</script>

<style scoped>
.clue-detail-page { background: var(--color-bg-page); }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 12px;
}

.info-section {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-primary);
  display: inline-block;
}

.claim-content {
  background: var(--color-bg-page);
  padding: 16px;
  border-radius: var(--radius-sm);
  line-height: 1.8;
  color: var(--color-text-primary);
}

.claim-polished-content {
  background: #e8f5e9;
  padding: 16px;
  border-radius: var(--radius-sm);
  line-height: 1.8;
  color: var(--color-success);
}

.evidence-list { padding: 8px 0; }
.evidence-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border-light);
}
.evidence-item:last-child { border-bottom: none; }
.evidence-info { flex: 1; }
.evidence-name { font-size: 14px; color: var(--color-text-primary); }
.evidence-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }

.timeline { padding: 16px; }
.timeline-content { line-height: 1.6; }
.timeline-action { font-weight: 600; }
.timeline-operator { font-size: 12px; color: var(--color-text-muted); }
.timeline-opinion { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }

.risk-item {
  color: var(--color-risk-high);
  line-height: 1.8;
  list-style: none;
  padding: 4px 0;
}
.risk-item::before { content: '• '; font-weight: bold; }

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}
</style>
