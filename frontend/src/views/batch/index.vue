<template>
  <div class="batch-page page-container">
    <div class="page-header">
      <h2 class="page-title">批量办案</h2>
    </div>

    <el-table :data="aggregates" v-loading="loading" stripe>
      <el-table-column prop="aggregateNo" label="合集编号" width="180" />
      <el-table-column prop="name" label="合集名称" min-width="200" />
      <el-table-column prop="aggregateType" label="聚合类型" width="100">
        <template #default="{ row }">{{ getTypeLabel(row.aggregateType) }}</template>
      </el-table-column>
      <el-table-column prop="clueCount" label="线索数" width="80" align="center" />
      <el-table-column label="涉案金额" width="120" align="right">
        <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column prop="totalPersonCount" label="涉及人数" width="80" align="center" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'closed' ? 'info' : 'success'">
            {{ row.status === 'closed' ? '已关闭' : '进行中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdByName" label="创建人" width="100" />
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click="handleEnter(row)">进入批量办理</el-button>
          <el-button v-if="row.status !== 'closed'" type="warning" size="small" text @click="handleSplit(row)">拆分</el-button>
          <el-button v-if="row.status !== 'closed'" type="info" size="small" text @click="handleClose(row)">关闭</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 拆分对话框 -->
    <el-dialog v-model="splitDialogVisible" title="拆分合集" width="700px" destroy-on-close>
      <p style="margin-bottom: 12px; color: var(--color-text-secondary);">
        选择要移出合集的线索（移出后线索将恢复为独立状态）：
      </p>
      <el-table :data="splitClueList" ref="splitTableRef" @selection-change="onSplitSelectionChange" stripe max-height="400">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="clueNo" label="线索编号" width="160" />
        <el-table-column prop="applicantName" label="申请人" width="100" />
        <el-table-column prop="projectName" label="项目" min-width="160" />
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="riskLevel" label="风险" width="70">
          <template #default="{ row }">
            <el-tag size="small" :type="riskTagType(row.riskLevel)">{{ riskLabel(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 8px; font-size: 13px; color: var(--color-text-muted);">
        已选 {{ splitSelected.length }} 条（共 {{ splitClueList.length }} 条）
      </div>
      <template #footer>
        <el-button @click="splitDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="splitSelected.length === 0" :loading="splitLoading" @click="confirmSplit">
          确认拆分
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { batchApi } from '@/api'
import { ElMessage, ElMessageBox, type TableInstance } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const aggregates = ref<any[]>([])

const typeMap: Record<string, string> = {
  project: '同工地', subject: '同企业', contractor: '同包工头', area: '同区域',
}

function getTypeLabel(type: string) { return typeMap[type] || type }

function handleEnter(row: any) {
  router.push(`/batch/${row.id}`)
}

async function handleClose(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认关闭合集「${row.name}」？关闭后线索将解除聚合状态。`,
      '关闭确认',
      { confirmButtonText: '确认关闭', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await batchApi.close(row.id)
    ElMessage.success('合集已关闭')
    loadData()
  } catch (e: any) {
    ElMessage.error(`关闭失败：${e?.message || '未知错误'}`)
  }
}

// 拆分相关
const splitDialogVisible = ref(false)
const splitLoading = ref(false)
const splitCurrentAggregate = ref<any>(null)
const splitClueList = ref<any[]>([])
const splitSelected = ref<any[]>([])
const splitTableRef = ref<TableInstance>()

async function handleSplit(row: any) {
  splitCurrentAggregate.value = row
  splitSelected.value = []
  splitDialogVisible.value = true
  try {
    const detail = await batchApi.getAggregateDetail(row.id)
    splitClueList.value = detail.aggregateClues.map((ac: any) => ac.clue)
  } catch {
    ElMessage.error('加载合集详情失败')
    splitDialogVisible.value = false
  }
}

function onSplitSelectionChange(rows: any[]) {
  splitSelected.value = rows
}

async function confirmSplit() {
  if (splitSelected.value.length === 0) {
    ElMessage.warning('请选择要移除的线索')
    return
  }
  if (splitSelected.value.length === splitClueList.value.length) {
    ElMessage.warning('不能移除全部线索，请使用「关闭合集」操作')
    return
  }
  splitLoading.value = true
  try {
    await batchApi.split(splitCurrentAggregate.value.id, splitSelected.value.map((c: any) => c.id))
    ElMessage.success('拆分成功')
    splitDialogVisible.value = false
    loadData()
  } catch (e: any) {
    ElMessage.error(`拆分失败：${e?.message || '未知错误'}`)
  } finally {
    splitLoading.value = false
  }
}

function riskLabel(level: string) {
  const map: Record<string, string> = { high: '高', medium: '中', low: '低' }
  return map[level] || level
}

function riskTagType(level: string) {
  const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'success' }
  return (map[level] || 'info') as any
}

async function loadData() {
  loading.value = true
  try {
    aggregates.value = await batchApi.getAggregates()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.batch-page { background: var(--color-bg-page); }
</style>
