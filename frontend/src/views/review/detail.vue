<template>
  <div class="review-detail-page page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-title">
        <el-button text @click="router.push('/review')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <span class="page-title">{{ caseInfo?.title || 'AI辅助审查' }}</span>
        <el-tag v-if="caseInfo" size="small">{{ caseInfo.caseNo }}</el-tag>
        <el-tag v-if="reviewInfo" :type="getConclusionTagType(reviewInfo?.conclusion)">
          {{ getConclusionLabel(reviewInfo?.conclusion) }}
        </el-tag>
      </div>
      <div class="btn-group">
        <el-button :loading="reporting" @click="handleGenerateReport">生成分析报告</el-button>
        <el-dropdown trigger="click" @command="handleGenerateDocument">
          <el-button :loading="generatingDoc">
            生成文书
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="support_prosecution">支持起诉书</el-dropdown-item>
              <el-dropdown-item command="civil_complaint">民事起诉状</el-dropdown-item>
              <el-dropdown-item command="civil_judgment">民事判决书</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" @click="handleStartReview" :loading="reviewing">
          {{ reviewing ? 'AI审查中' : reviewInfo ? '重新审查' : '启动AI审查' }}
        </el-button>
        <el-button type="success" :disabled="!canConfirm" @click="handleConfirm">确认审查意见</el-button>
      </div>
    </div>

    <el-alert
      v-if="reviewInfo?.fallback"
      type="warning"
      title="AI服务调用超时或不可用，当前结果由规则兜底生成。"
      :closable="false"
      show-icon
      class="fallback-alert"
    />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="AI审查意见" name="review">
        <div v-if="reviewInfo" class="review-result">
          <el-alert
            :type="getConclusionAlertType(reviewInfo.conclusion)"
            :title="reviewInfo.conclusionText"
            :closable="false"
            show-icon
            class="conclusion-alert"
          />
          <el-row :gutter="16">
            <el-col :span="14">
              <div class="result-card">
                <div class="card-title">审查维度结果</div>
                <el-table :data="reviewInfo.dimensions" stripe size="small">
                  <el-table-column prop="dimension" label="审查维度" width="150" />
                  <el-table-column label="结果" width="90">
                    <template #default="{ row }">
                      <el-tag size="small" :type="getResultTag(row.result)">
                        {{ getResultLabel(row.result) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="reason" label="理由" min-width="220" />
                  <el-table-column label="置信度" width="90">
                    <template #default="{ row }">{{ ((Number(row.confidence) || 0) * 100).toFixed(0) }}%</template>
                  </el-table-column>
                </el-table>
              </div>
            </el-col>
            <el-col :span="10">
              <div class="result-card">
                <div class="card-title">证据审查</div>
                <div v-if="reviewInfo.missingEvidence?.length">
                  <div v-for="item in reviewInfo.missingEvidence" :key="item" class="missing-item">
                    <el-icon color="#e5a50a"><Warning /></el-icon>
                    {{ item }}
                  </div>
                </div>
                <div v-else class="muted-text">暂无明显缺失证据</div>
                <el-divider />
                <div class="card-title">法律依据</div>
                <div v-for="ref in reviewInfo.legalReferences" :key="ref" class="legal-ref">{{ ref }}</div>
              </div>
            </el-col>
          </el-row>
          <div v-if="reviewInfo.riskReasons?.length" class="result-card risk-card">
            <div class="card-title risk-title">
              <el-icon color="#c01c28"><WarningFilled /></el-icon>
              风险提示
            </div>
            <div v-for="reason in reviewInfo.riskReasons" :key="reason" class="risk-reason">{{ reason }}</div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无审查结果，请点击“启动AI审查”开始。</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="初步分析报告" name="report">
        <div class="report-content" v-if="report">{{ report }}</div>
        <div v-else class="empty-state">
          <p>请点击“生成分析报告”生成报告。</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="履职办案指引" name="guidance">
        <div v-if="guidance" class="guidance-content">
          <div class="guidance-section">
            <div class="section-title"><el-icon color="#e5a50a"><Warning /></el-icon>调查取证重点</div>
            <ul>
              <li v-for="item in guidance.investigation?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-title"><el-icon color="#26a269"><Document /></el-icon>证据收集清单</div>
            <ul>
              <li v-for="item in guidance.evidence?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-title"><el-icon color="#1a5fb4"><ChatDotRound /></el-icon>谈话询问重点</div>
            <ul>
              <li v-for="item in guidance.interview?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-title"><el-icon color="#c01c28"><WarningFilled /></el-icon>涉稳风险防控</div>
            <ul>
              <li v-for="item in guidance.riskControl?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-title"><el-icon color="#3584e4"><Connection /></el-icon>跨部门协同建议</div>
            <ul>
              <li v-for="item in guidance.coordination?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无履职指引。</p>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  ArrowLeft,
  ChatDotRound,
  Connection,
  Document,
  Warning,
  WarningFilled,
} from '@element-plus/icons-vue'
import { caseApi, documentApi, reviewApi } from '@/api'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const reviewing = ref(false)
const reporting = ref(false)
const generatingDoc = ref(false)
const activeTab = ref('review')
const caseInfo = ref<any>(null)
const reviewInfo = ref<any>(null)
const report = ref('')
const guidance = ref<any>(null)
const allDimensionsConfirmed = ref(false)

const canConfirm = computed(() => Boolean(reviewInfo.value && !allDimensionsConfirmed.value))

function getConclusionAlertType(conclusion: string) {
  if (conclusion === 'accept') return 'success'
  if (conclusion === 'need_more_evidence') return 'warning'
  return 'error'
}

function getConclusionTagType(conclusion: string) {
  if (conclusion === 'accept') return 'success'
  if (conclusion === 'need_more_evidence') return 'warning'
  return 'danger'
}

function getConclusionLabel(conclusion: string) {
  if (conclusion === 'accept') return '建议受理'
  if (conclusion === 'need_more_evidence') return '补充材料后受理'
  if (conclusion === 'reject') return '不予受理'
  return '待审查'
}

function getResultTag(result: string) {
  if (result === 'pass') return 'success'
  if (result === 'warning') return 'warning'
  return 'danger'
}

function getResultLabel(result: string) {
  if (result === 'pass') return '通过'
  if (result === 'warning') return '警告'
  return '不通过'
}

function buildReviewInfoFromResults(results: any[]) {
  const hasFail = results.some((item) => item.result === 'fail')
  const hasWarning = results.some((item) => item.result === 'warning')
  return {
    conclusion: hasFail ? 'reject' : hasWarning ? 'need_more_evidence' : 'accept',
    conclusionText: hasFail ? '审查存在不通过项。' : hasWarning ? '存在需补充或复核事项。' : '符合支持起诉受理的基本条件。',
    dimensions: results.map((item) => ({
      dimension: item.dimension,
      result: item.result,
      reason: item.reason,
      confidence: Number(item.confidence || 0),
      suggestions: item.suggestions,
    })),
    missingEvidence: [],
    legalReferences: [],
    riskReasons: [],
  }
}

async function loadData() {
  const caseId = route.params.caseId as string
  loading.value = true
  try {
    const [caseRes, resultsRes, guidanceRes] = await Promise.all([
      caseApi.getById(caseId).catch(() => null),
      reviewApi.getResults(caseId).catch(() => null),
      reviewApi.getGuidance(caseId).catch(() => null),
    ])
    caseInfo.value = caseRes
    guidance.value = guidanceRes?.guidance || guidanceRes
    if (caseRes?.aiReviewResult) {
      reviewInfo.value = caseRes.aiReviewResult
    } else if (resultsRes?.all?.length) {
      reviewInfo.value = buildReviewInfoFromResults(resultsRes.all)
    }
    allDimensionsConfirmed.value = Boolean(resultsRes?.totalCount && resultsRes.confirmedCount === resultsRes.totalCount)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function handleStartReview() {
  const caseId = route.params.caseId as string
  reviewing.value = true
  try {
    const res = await reviewApi.start(caseId)
    reviewInfo.value = res
    allDimensionsConfirmed.value = false
    ElMessage.success(res?.fallback ? '已使用规则兜底生成审查意见' : 'AI审查完成')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '审查失败')
  } finally {
    reviewing.value = false
  }
}

async function handleConfirm() {
  try {
    await reviewApi.confirm(route.params.caseId as string)
    ElMessage.success('审查意见已确认')
    allDimensionsConfirmed.value = true
  } catch (error) {
    console.error(error)
    ElMessage.error('操作失败')
  }
}

async function handleGenerateReport() {
  reporting.value = true
  try {
    const res = await reviewApi.getReport(route.params.caseId as string)
    report.value = res.report
    activeTab.value = 'report'
  } catch (error) {
    console.error(error)
    ElMessage.error('生成失败')
  } finally {
    reporting.value = false
  }
}

async function handleGenerateDocument(docType: string) {
  generatingDoc.value = true
  try {
    const doc = await documentApi.generate(route.params.caseId as string, { docType })
    ElMessage.success('文书已生成')
    router.push(`/document/${doc.id}`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '信息不全，无法生成')
  } finally {
    generatingDoc.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.review-detail-page {
  background: var(--color-bg-page);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-title,
.btn-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.fallback-alert,
.conclusion-alert {
  margin-bottom: 16px;
}

.result-card,
.guidance-section,
.report-content {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.risk-card {
  margin-top: 16px;
}

.card-title,
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.missing-item {
  padding: 8px 0;
  font-size: 13px;
  color: #8a6d00;
}

.legal-ref,
.muted-text {
  padding: 6px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.risk-title,
.risk-reason {
  color: var(--color-risk-high);
}

.risk-reason {
  padding: 6px 0;
  font-size: 13px;
}

.guidance-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.guidance-section ul {
  padding-left: 20px;
  margin: 0;
}

.guidance-section li {
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.report-content {
  line-height: 1.8;
  white-space: pre-wrap;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--color-text-muted);
}
</style>
