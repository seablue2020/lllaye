<template>
  <div class="batch-detail-page page-container" v-loading="loading">
    <template v-if="aggregate">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <el-button text @click="router.push('/batch')">
            <el-icon><ArrowLeft /></el-icon>返回
          </el-button>
          <span class="page-title">{{ aggregate.name }}</span>
          <el-tag :type="aggregate.status === 'closed' ? 'info' : 'success'">
            {{ aggregate.status === 'closed' ? '已关闭' : '进行中' }}
          </el-tag>
          <el-tag type="primary">{{ getTypeLabel(aggregate.aggregateType) }}</el-tag>
        </div>
        <div class="btn-group">
          <el-button v-if="aggregate.status !== 'closed'" type="primary" @click="handleBatchAction('accept')" :loading="actionLoading">
            批量受理
          </el-button>
          <el-button v-if="aggregate.status !== 'closed'" type="warning" @click="handleBatchAction('triage')" :loading="actionLoading">
            批量分流
          </el-button>
          <el-button v-if="aggregate.status !== 'closed'" type="danger" @click="handleBatchAction('reject')" :loading="actionLoading">
            批量退回
          </el-button>
        </div>
      </div>

      <!-- 汇总信息 -->
      <el-row :gutter="16" class="summary-row">
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="summary-item">
              <div class="summary-label">涉案金额</div>
              <div class="summary-value">¥{{ Number(aggregate.totalAmount || 0).toLocaleString() }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="summary-item">
              <div class="summary-label">涉及人数</div>
              <div class="summary-value">{{ aggregate.totalPersonCount }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="summary-item">
              <div class="summary-label">线索数量</div>
              <div class="summary-value">{{ aggregate.clueCount }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="summary-item">
              <div class="summary-label">高风险线索</div>
              <div class="summary-value">{{ highRiskCount }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 批量操作提示 -->
      <div v-if="selectedClues.length > 0" class="batch-tip">
        <el-icon color="#409EFF"><InfoFilled /></el-icon>
        已选 <strong>{{ selectedClues.length }}</strong> 条线索
        <el-button text type="primary" size="small" @click="selectedClues = []">清空</el-button>
      </div>

      <!-- 线索表格 -->
      <el-table
        :data="clues"
        ref="tableRef"
        @selection-change="onSelectionChange"
        stripe
        class="clue-table"
      >
        <el-table-column v-if="aggregate.status !== 'closed'" type="selection" width="50" />
        <el-table-column prop="clueNo" label="线索编号" width="180" />
        <el-table-column prop="applicantName" label="申请人" width="100" />
        <el-table-column prop="subjectName" label="涉事主体" min-width="160" />
        <el-table-column prop="projectName" label="项目/工地" min-width="180" />
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">
            <span>¥{{ Number(row.amount || 0).toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="personCount" label="人数" width="70" align="center" />
        <el-table-column prop="riskLevel" label="风险" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="riskTagType(row.riskLevel)">
              {{ riskLabel(row.riskLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="openClue(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部操作 -->
      <div class="detail-footer">
        <el-button @click="router.push('/batch')">返回列表</el-button>
        <el-button type="primary" :disabled="selectedClues.length === 0" @click="createCase">
          从选中创建案件 ({{ selectedClues.length }})
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { batchApi } from '@/api'
import { ElMessage, ElMessageBox, type TableInstance } from 'element-plus'
import { ArrowLeft, InfoFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const actionLoading = ref(false)
const aggregate = ref<any>(null)
const selectedClues = ref<any[]>([])
const tableRef = ref<TableInstance>()

const clues = computed(() => aggregate.value?.aggregateClues?.map((ac: any) => ac.clue) || [])

const highRiskCount = computed(() =>
  clues.value.filter((c: any) => c.riskLevel === 'high').length
)

const typeMap: Record<string, string> = {
  project: '同工地', subject: '同企业', contractor: '同包工头', area: '同区域',
}

function getTypeLabel(type: string) {
  return typeMap[type] || type
}

function riskLabel(level: string) {
  const map: Record<string, string> = { high: '高', medium: '中', low: '低' }
  return map[level] || level
}

function riskTagType(level: string) {
  const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'success' }
  return (map[level] || 'info') as any
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_review: '待审查',
    under_review: '审查中',
    triaged: '已分流',
    accepted: '已受理',
    rejected: '已退回',
    completed: '已完成',
  }
  return map[status] || status
}

function statusTagType(status: string) {
  const map: Record<string, string> = {
    pending_review: 'info',
    under_review: 'warning',
    triaged: 'success',
    accepted: 'success',
    rejected: 'danger',
    completed: '',
  }
  return (map[status] || 'info') as any
}

function onSelectionChange(rows: any[]) {
  selectedClues.value = rows
}

function openClue(row: any) {
  router.push(`/clue/${row.id}`)
}

async function handleBatchAction(action: string) {
  const targetIds = selectedClues.value.length > 0
    ? selectedClues.value.map((c: any) => c.id)
    : clues.value.map((c: any) => c.id)

  if (targetIds.length === 0) {
    ElMessage.warning('没有可操作的线索')
    return
  }

  const actionLabels: Record<string, string> = {
    accept: '批量受理',
    triage: '批量分流',
    reject: '批量退回',
  }

  try {
    await ElMessageBox.confirm(
      selectedClues.value.length > 0
        ? `将对选中的 ${selectedClues.value.length} 条线索执行「${actionLabels[action]}」，是否继续？`
        : `将对全部 ${clues.value.length} 条线索执行「${actionLabels[action]}」，是否继续？`,
      actionLabels[action],
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  actionLoading.value = true
  try {
    await batchApi.process(aggregate.value.id, action)
    ElMessage.success(`${actionLabels[action]}成功`)
    await loadData()
    selectedClues.value = []
  } catch (e: any) {
    ElMessage.error(`${actionLabels[action]}失败：${e?.message || '未知错误'}`)
  } finally {
    actionLoading.value = false
  }
}

async function createCase() {
  if (selectedClues.value.length === 0) {
    ElMessage.warning('请先选择线索')
    return
  }
  ElMessage.info(`从 ${selectedClues.value.length} 条选中线索创建案件功能待实现`)
}

async function loadData() {
  loading.value = true
  try {
    aggregate.value = await batchApi.getAggregateDetail(routeId.value)
  } catch (e: any) {
    ElMessage.error('加载合集详情失败')
    router.push('/batch')
  } finally {
    loading.value = false
  }
}

const routeId = computed(() => route.params.id as string)

onMounted(() => { loadData() })
</script>

<style scoped>
.batch-detail-page {
  background: var(--color-bg-page);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.summary-row {
  margin-bottom: 16px;
}

.summary-item {
  text-align: center;
}

.summary-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.batch-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #409eff;
}

.clue-table {
  margin-bottom: 20px;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
}
</style>
