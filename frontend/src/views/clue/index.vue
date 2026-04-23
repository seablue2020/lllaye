<template>
  <div class="clue-page page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">线索管理</h2>
      <div class="btn-group">
        <el-button type="primary" @click="showAggregateDialog = true">
          <el-icon><Connection /></el-icon>
          线索智能聚合
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar card">
      <el-row :gutter="12" align="middle">
        <el-col :span="5">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索：线索编号/姓名/工地/企业"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </el-col>
        <el-col :span="3">
          <el-select v-model="queryParams.status" placeholder="线索状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="待研判" value="pending_review" />
            <el-option label="已分流" value="triaged" />
            <el-option label="待审查" value="under_review" />
            <el-option label="已办结" value="closed" />
            <el-option label="不予受理" value="rejected" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="queryParams.riskLevel" placeholder="风险等级" clearable>
            <el-option label="高风险" value="high" />
            <el-option label="中风险" value="medium" />
            <el-option label="低风险" value="low" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="queryParams.claimType" placeholder="诉求类型" clearable>
            <el-option label="支持起诉" value="support_prosecution" />
            <el-option label="欠薪投诉" value="wage_complaint" />
            <el-option label="法律咨询" value="legal_consult" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="queryParams.source" placeholder="线索来源" clearable>
            <el-option label="前端填报" value="frontend" />
            <el-option label="12345热线" value="hotline_12345" />
            <el-option label="部门共享" value="dept_share" />
            <el-option label="单位移送" value="unit_transfer" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-checkbox v-model="queryParams.isKey">重点线索</el-checkbox>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 表格 -->
    <div class="card table-card">
      <el-table
        :data="clueList"
        v-loading="loading"
        stripe
        @row-click="handleRowClick"
        row-class-name="clickable-row"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="clueNo" label="线索编号" width="160">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click.stop="router.push(`/clue/${row.id}`)">
              {{ row.clueNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="applicantName" label="提交人" width="100" />
        <el-table-column prop="subjectName" label="涉事主体" min-width="160" />
        <el-table-column prop="projectName" label="涉事工地" min-width="160" show-overflow-tooltip />
        <el-table-column prop="amount" label="欠薪金额" width="120" align="right">
          <template #default="{ row }">
            {{ row.amount ? `¥${Number(row.amount).toLocaleString()}` : '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="personCount" label="人数" width="70" align="center" />
        <el-table-column prop="claimType" label="诉求类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getClaimTypeTag(row.claimType)">
              {{ getClaimTypeLabel(row.claimType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="140">
          <template #default="{ row }">
            <div style="display: flex; gap: 4px; flex-wrap: wrap">
              <el-tag v-if="row.isKey" type="danger" size="small">重点</el-tag>
              <el-tag v-if="row.isAggregated" type="primary" size="small">聚合</el-tag>
              <el-tag v-if="row.riskLevel === 'high'" type="danger" size="small">高风险</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusTag(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="100">
          <template #default="{ row }">
            {{ getSourceLabel(row.source) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">
            {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click.stop="router.push(`/clue/${row.id}`)">查看</el-button>
            <el-button
              v-if="row.status === 'pending_review'"
              type="warning"
              size="small"
              text
              @click.stop="handleTriage(row)"
            >分流</el-button>
            <el-button
              v-if="row.status === 'under_review'"
              type="success"
              size="small"
              text
              @click.stop="router.push(`/review/${row.id}`)"
            >审查</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <!-- 智能聚合对话框 -->
    <el-dialog v-model="showAggregateDialog" title="线索智能聚合" width="600px">
      <el-form :model="aggregateForm" label-width="120px">
        <el-form-item label="聚合维度">
          <el-radio-group v-model="aggregateForm.dimension">
            <el-radio value="project">同工地/项目</el-radio>
            <el-radio value="subject">同企业</el-radio>
            <el-radio value="contractor">同包工头</el-radio>
            <el-radio value="area">同区域</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="相似度阈值">
          <el-slider v-model="aggregateForm.similarityThreshold" :min="0.5" :max="1" :step="0.01" show-stops :marks="{ 0.85: '0.85(自动)', 0.7: '0.70(待确认)' }" />
        </el-form-item>
        <el-form-item label="说明">
          <div style="color: var(--color-text-muted); font-size: 12px; line-height: 1.6">
            <p>系统将根据地址、项目名、涉事主体等维度进行语义相似度匹配</p>
            <p>综合评分 ≥ {{ aggregateForm.similarityThreshold }} 自动建议聚合</p>
            <p>低于阈值进入人工待确认池</p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAggregateDialog = false">取消</el-button>
        <el-button type="primary" :loading="aggregateLoading" @click="handleAggregate">开始聚合</el-button>
      </template>
    </el-dialog>

    <!-- 分流对话框 -->
    <el-dialog v-model="showTriageDialog" title="线索分流" width="500px">
      <el-form :model="triageForm" label-width="100px">
        <el-form-item label="分流操作">
          <el-radio-group v-model="triageForm.action">
            <el-radio value="accept">受理</el-radio>
            <el-radio value="reject">不予受理</el-radio>
            <el-radio value="transfer">移送</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="triageForm.action === 'reject'" label="不予受理原因">
          <el-input v-model="triageForm.rejectionReason" type="textarea" :rows="3" placeholder="请填写不予受理原因" />
        </el-form-item>
        <el-form-item label="分流意见">
          <el-input v-model="triageForm.opinion" type="textarea" :rows="3" placeholder="请填写分流意见" />
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
import { useRouter } from 'vue-router'
import { clueApi } from '@/api'
import { ElMessage } from 'element-plus'
import { Search, Download, Connection } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const clueList = ref<any[]>([])
const showAggregateDialog = ref(false)
const showTriageDialog = ref(false)
const aggregateLoading = ref(false)

const queryParams = reactive({
  keyword: '',
  status: '',
  riskLevel: '',
  claimType: '',
  source: '',
  isKey: false,
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const aggregateForm = reactive({
  dimension: 'project',
  similarityThreshold: 0.85,
})

const triageForm = reactive({
  action: 'accept',
  opinion: '',
  rejectionReason: '',
})

let currentTriageClue: any = null

const claimTypeMap: Record<string, string> = {
  support_prosecution: '支持起诉',
  wage_complaint: '欠薪投诉',
  legal_consult: '法律咨询',
  other: '其他',
}

const statusMap: Record<string, string> = {
  pending_review: '待研判',
  triaged: '已分流',
  under_review: '待审查',
  investigating: '调查中',
  document_review: '文书审核',
  closed: '已办结',
  rejected: '不予受理',
}

const sourceMap: Record<string, string> = {
  frontend: '前端填报',
  hotline_12345: '12345热线',
  dept_share: '部门共享',
  unit_transfer: '单位移送',
}

function getClaimTypeLabel(type: string) {
  return claimTypeMap[type] || type
}

function getClaimTypeTag(type: string) {
  if (type === 'support_prosecution') return 'warning'
  if (type === 'wage_complaint') return 'danger'
  return 'info'
}

function getStatusLabel(status: string) {
  return statusMap[status] || status
}

function getStatusTag(status: string) {
  if (status === 'pending_review') return 'warning'
  if (status === 'under_review') return 'primary'
  if (status === 'closed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}

function getSourceLabel(source: string) {
  return sourceMap[source] || source
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  Object.assign(queryParams, {
    keyword: '',
    status: '',
    riskLevel: '',
    claimType: '',
    source: '',
    isKey: false,
  })
  handleSearch()
}

function handleRowClick(row: any) {
  router.push(`/clue/${row.id}`)
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...queryParams,
    }
    const res = await clueApi.list(params)
    clueList.value = res.list
    pagination.total = res.total
  } catch (e) {
    console.error('Failed to load clues', e)
  } finally {
    loading.value = false
  }
}

function handleTriage(row: any) {
  currentTriageClue = row
  Object.assign(triageForm, { action: 'accept', opinion: '', rejectionReason: '' })
  showTriageDialog.value = true
}

async function handleTriageSubmit() {
  if (!currentTriageClue) return
  try {
    await clueApi.triage(currentTriageClue.id, triageForm)
    ElMessage.success('分流成功')
    showTriageDialog.value = false
    loadData()
  } catch (e) {
    ElMessage.error('分流失败')
  }
}

async function handleAggregate() {
  aggregateLoading.value = true
  try {
    await clueApi.aggregate(aggregateForm)
    ElMessage.success('聚合完成')
    showAggregateDialog.value = false
    loadData()
  } catch (e) {
    ElMessage.error('聚合失败')
  } finally {
    aggregateLoading.value = false
  }
}

function handleExport() {
  ElMessage.info('导出功能开发中')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.clue-page {
  background: var(--color-bg-page);
}

.filter-bar {
  margin-bottom: 16px;
  padding: 16px;
}

.table-card {
  padding: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

:deep(.clickable-row) {
  cursor: pointer;
}
</style>
