<template>
  <div class="review-detail-page page-container" v-loading="loading">
    <div class="page-header">
      <div>
        <el-button text @click="router.push('/review')"><el-icon><ArrowLeft /></el-icon>返回</el-button>
        <span class="page-title">{{ caseInfo?.title || 'AI辅助审查' }}</span>
        <el-tag v-if="caseInfo" size="small">{{ caseInfo.caseNo }}</el-tag>
        <el-tag :type="getConclusionType(reviewInfo?.conclusion)" v-if="reviewInfo">
          {{ getConclusionLabel(reviewInfo?.conclusion) }}
        </el-tag>
      </div>
      <div class="btn-group">
        <el-button @click="handleGenerateReport">生成分析报告</el-button>
        <el-button type="primary" @click="handleStartReview" :loading="reviewing">
          {{ reviewInfo ? '重新审查' : '启动AI审查' }}
        </el-button>
        <el-button type="success" :disabled="!canConfirm" @click="handleConfirm">确认审查意见</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="AI审查意见" name="review">
        <div v-if="reviewInfo" class="review-result">
          <el-alert
            :type="getConclusionType(reviewInfo.conclusion)"
            :title="reviewInfo.conclusionText"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          />
          <el-row :gutter="16">
            <el-col :span="12">
              <div class="result-card">
                <div class="card-title">审查维度结果</div>
                <el-table :data="reviewInfo.dimensions" stripe size="small">
                  <el-table-column prop="dimension" label="审查维度" width="160" />
                  <el-table-column label="结果" width="80">
                    <template #default="{ row }">
                      <el-tag size="small" :type="getResultTag(row.result)">{{ getResultLabel(row.result) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="reason" label="理由" min-width="200" />
                  <el-table-column label="置信度" width="80">
                    <template #default="{ row }">{{ ((row.confidence || 0) * 100).toFixed(0) }}%</template>
                  </el-table-column>
                </el-table>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="result-card">
                <div class="card-title">证据审查</div>
                <div v-for="item in reviewInfo.missingEvidence" :key="item" class="missing-item">
                  <el-icon color="#e5a50a"><Warning /></el-icon> {{ item }}
                </div>
                <el-divider />
                <div class="card-title">法律依据</div>
                <div v-for="ref in reviewInfo.legalReferences" :key="ref" class="legal-ref">{{ ref }}</div>
              </div>
            </el-col>
          </el-row>
          <div v-if="reviewInfo.riskReasons?.length" class="result-card" style="margin-top: 16px">
            <div class="card-title" style="color: var(--color-risk-high)">
              <el-icon color="#c01c28"><WarningFilled /></el-icon>风险提示
            </div>
            <div v-for="reason in reviewInfo.riskReasons" :key="reason" class="risk-reason">{{ reason }}</div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无审查结果，请点击「启动AI审查」按钮开始审查</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="初步分析报告" name="report">
        <div class="report-content" v-if="report">
          <div v-html="report"></div>
        </div>
        <div v-else class="empty-state">
          <p>请点击「生成分析报告」按钮生成报告</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="履职办案指引" name="guidance">
        <div v-if="guidance" class="guidance-content">
          <div class="guidance-section">
            <div class="section-icon"><el-icon color="#e5a50a" :size="20"><Warning /></el-icon></div>
            <div class="section-title">调查取证重点提示</div>
            <ul>
              <li v-for="item in guidance.investigation?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-icon"><el-icon color="#26a269" :size="20"><Document /></el-icon></div>
            <div class="section-title">证据收集清单</div>
            <ul>
              <li v-for="item in guidance.evidence?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-icon"><el-icon color="#1a5fb4" :size="20"><ChatDotRound /></el-icon></div>
            <div class="section-title">谈话询问重点问题</div>
            <ul>
              <li v-for="item in guidance.interview?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-icon"><el-icon color="#c01c28" :size="20"><WarningFilled /></el-icon></div>
            <div class="section-title">涉稳风险防控提示</div>
            <ul>
              <li v-for="item in guidance.riskControl?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="guidance-section">
            <div class="section-icon"><el-icon color="#3584e4" :size="20"><Connection /></el-icon></div>
            <div class="section-title">跨部门协调建议</div>
            <ul>
              <li v-for="item in guidance.coordination?.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无履职指引</p>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reviewApi, caseApi } from '@/api'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Warning, WarningFilled, Document, ChatDotRound, Connection } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const reviewing = ref(false)
const activeTab = ref('review')
const caseInfo = ref<any>(null)
const reviewInfo = ref<any>(null)
const report = ref('')
const guidance = ref<any>(null)

const canConfirm = computed(() => reviewInfo.value && !allDimensionsConfirmed.value)
const allDimensionsConfirmed = ref(false)

function getConclusionType(conclusion: string) {
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
    guidance.value = guidanceRes
    if (resultsRes?.all?.length) {
      const first = resultsRes.all[0]
      reviewInfo.value = {
        conclusion: first.result === 'fail' ? 'reject' : 'warning' ? 'need_more_evidence' : 'accept',
        conclusionText: first.result === 'fail' ? '审查不通过' : '待确认',
        dimensions: resultsRes.all.map((r: any) => ({
          dimension: r.dimension,
          result: r.result,
          reason: r.reason,
          confidence: r.confidence,
          suggestions: r.suggestions,
        })),
        missingEvidence: [],
        legalReferences: [],
        riskReasons: [],
      }
    }
  } catch (e) {
    console.error(e)
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
    ElMessage.success('AI审查完成')
  } catch (e: any) {
    ElMessage.error(e?.message || '审查失败')
  } finally {
    reviewing.value = false
  }
}

async function handleConfirm() {
  try {
    await reviewApi.confirm(route.params.caseId as string)
    ElMessage.success('审查意见已确认')
    allDimensionsConfirmed.value = true
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function handleGenerateReport() {
  try {
    const res: any = await reviewApi.getReport(route.params.caseId as string)
    report.value = res.report
    activeTab.value = 'report'
  } catch (e) {
    ElMessage.error('生成失败')
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.review-detail-page { background: var(--color-bg-page); }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title { font-size: 18px; font-weight: 600; margin: 0 12px; }

.result-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.card-title {
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

.legal-ref {
  padding: 6px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: 'Times New Roman', serif;
}

.risk-reason {
  padding: 6px 0;
  font-size: 13px;
  color: var(--color-risk-high);
}

.guidance-content { display: flex; flex-direction: column; gap: 16px; }

.guidance-section {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.section-icon { margin-bottom: 8px; }

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
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
  background: #fff;
  border-radius: var(--radius-md);
  padding: 32px;
  box-shadow: var(--shadow-sm);
  line-height: 1.8;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--color-text-muted);
}
</style>
