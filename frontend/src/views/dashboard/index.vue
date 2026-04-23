<template>
  <div class="dashboard-page">
    <!-- 顶部通栏 -->
    <div class="page-header-full">
      <div class="header-left">
        <h2 class="system-title">欠薪支持起诉智能办案平台（检察端）</h2>
        <span class="org-name">{{ userStore.orgName || '区人民检察院' }}</span>
      </div>
      <div class="header-right">
        <span class="user-name">{{ userStore.userName }}</span>
        <el-tag size="small">{{ userStore.role }}</el-tag>
        <el-badge :value="taskBadgeCount" :hidden="taskBadgeCount === 0" class="task-badge">
          <el-button text size="small">待办任务</el-button>
        </el-badge>
      </div>
    </div>

    <!-- 核心指标看板 -->
    <div class="metrics-grid">
      <div class="metric-card metric-pending" @click="router.push('/clue?status=pending_review')">
        <div class="metric-icon"><el-icon :size="32"><Clock /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-high">{{ metrics?.pendingClues ?? '—' }}</div>
          <div class="metric-label">待研判线索总数</div>
          <div class="metric-sub">今日新增 {{ metrics?.pendingCluesNew ?? 0 }} 条</div>
        </div>
      </div>

      <div class="metric-card metric-key" @click="router.push('/clue?isKey=true')">
        <div class="metric-icon"><el-icon :size="32"><Warning /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-medium">{{ metrics?.keyClues ?? '—' }}</div>
          <div class="metric-label">待审查重点线索</div>
          <div class="metric-sub">超期预警 {{ metrics?.keyCluesOverdue ?? 0 }} 条</div>
        </div>
      </div>

      <div class="metric-card metric-processing" @click="router.push('/review')">
        <div class="metric-icon"><el-icon :size="32"><Collection /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-medium">{{ metrics?.processingCases ?? '—' }}</div>
          <div class="metric-label">办理中支持起诉案件</div>
          <div class="metric-sub">本月新受理 {{ metrics?.processingCasesNew ?? 0 }} 件</div>
        </div>
      </div>

      <div class="metric-card metric-closed">
        <div class="metric-icon"><el-icon :size="32"><CircleCheck /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-low">{{ metrics?.closedCases ?? '—' }}</div>
          <div class="metric-label">已办结案件数</div>
          <div class="metric-sub">采纳率 {{ metrics?.adoptionRate ?? 0 }}%</div>
        </div>
      </div>
    </div>

    <!-- 核心业务区 -->
    <div class="business-area">
      <!-- 左侧：待办任务 + 今日动态 -->
      <div class="area-left">
        <div class="card">
          <div class="card-header">
            <span class="card-title">我的待办任务</span>
            <el-button text size="small" @click="router.push('/clue')">查看全部</el-button>
          </div>
          <div class="task-list" v-loading="loading">
            <div v-if="tasks.length === 0" class="empty-state">
              <el-icon :size="40" color="#d0d0d0"><SuccessFilled /></el-icon>
              <p>暂无待办任务</p>
            </div>
            <div
              v-for="task in tasks"
              :key="task.id"
              class="task-item"
              :class="{ overdue: task.isOverdue }"
              @click="handleTaskClick(task)"
            >
              <div class="task-left">
                <el-tag size="small" :type="getPriorityType(task.priority)">
                  {{ task.priorityLabel }}
                </el-tag>
                <el-tag size="small" type="info">{{ task.typeLabel }}</el-tag>
              </div>
              <div class="task-title">{{ task.title }}</div>
              <div class="task-actions">
                <el-button type="primary" size="small" text @click.stop="handleTaskClick(task)">立即办理</el-button>
                <el-button size="small" text @click.stop>一键分流</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top: 16px">
          <div class="card-header">
            <span class="card-title">今日线索动态</span>
            <el-tag type="info" size="small">{{ todayDynamics.length }} 条</el-tag>
          </div>
          <div class="dynamics-list">
            <div
              v-for="item in todayDynamics"
              :key="item.id"
              class="dynamics-item"
              @click="router.push(`/clue/${item.id}`)"
            >
              <span class="dynamics-clue-no">{{ item.clueNo }}</span>
              <span class="dynamics-name">{{ item.applicantName }}</span>
              <span class="dynamics-project">{{ item.projectName }}</span>
              <div class="dynamics-tags">
                <el-tag v-for="tag in item.tags" :key="tag" size="small" :type="getTagType(tag)">
                  {{ tag }}
                </el-tag>
              </div>
            </div>
            <div v-if="todayDynamics.length === 0" class="empty-state">
              <p>暂无今日动态</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：热力图 -->
      <div class="area-right">
        <div class="card card-full">
          <div class="card-header">
            <span class="card-title">案发地点分布热力图</span>
            <el-select v-model="heatmapType" size="small" style="width: 120px">
              <el-option label="按线索数" value="count" />
              <el-option label="按金额" value="amount" />
              <el-option label="按人数" value="person" />
            </el-select>
          </div>
          <div class="heatmap-container" ref="heatmapRef">
            <div v-if="heatmapData.length === 0" class="empty-state">
              <el-icon :size="48" color="#d0d0d0"><MapLocation /></el-icon>
              <p>暂无数据</p>
            </div>
            <div v-else class="heatmap-bars">
              <div
                v-for="(item, index) in heatmapData"
                :key="index"
                class="heatmap-bar-item"
              >
                <div class="bar-label">{{ item.name }}</div>
                <div class="bar-wrapper">
                  <div
                    class="bar-fill"
                    :style="{
                      height: `${getHeatmapHeight(item)}%`,
                      backgroundColor: getHeatmapColor(item),
                    }"
                  ></div>
                </div>
                <div class="bar-value">{{ getHeatmapValue(item) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 高风险预警看板 -->
    <div class="card risk-warning-card">
      <div class="card-header">
        <span class="card-title">
          <el-icon color="#c01c28"><WarningFilled /></el-icon>
          高风险涉稳线索预警
        </span>
        <el-button text size="small" @click="router.push('/clue?riskLevel=high')">查看全部</el-button>
      </div>
      <el-table :data="riskWarnings" stripe :max-height="300" v-loading="loading">
        <el-table-column prop="clueNo" label="线索编号" width="160" />
        <el-table-column prop="subjectName" label="涉事主体" min-width="180" />
        <el-table-column prop="personCount" label="涉及人数" width="100" align="center">
          <template #default="{ row }">
            <span :class="row.personCount >= 30 ? 'risk-high' : ''">{{ row.personCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="欠薪金额(元)" width="140" align="right">
          <template #default="{ row }">
            {{ row.amount?.toLocaleString() || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="danger" size="small">{{ row.riskLevel === 'high' ? '高风险' : row.riskLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警原因" min-width="240">
          <template #default="{ row }">
            <span>{{ row.riskReasonList?.join('；') || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" text @click="router.push(`/clue/${row.id}`)">优先办理</el-button>
            <el-button type="primary" size="small" text>一键督办</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import { useUserStore } from '@/stores/user'
import { clueApi } from '@/api'
import { ElMessage } from 'element-plus'
import {
  Clock, Warning, Collection, CircleCheck, SuccessFilled,
  MapLocation, WarningFilled,
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const dashboardStore = useDashboardStore()
const userStore = useUserStore()

const loading = ref(false)
const heatmapType = ref('count')
const heatmapData = ref<any[]>([])
const heatmapRef = ref<HTMLElement>()

const metrics = computed(() => dashboardStore.metrics)
const tasks = computed(() => dashboardStore.tasks)
const riskWarnings = computed(() => dashboardStore.riskWarnings)
const todayDynamics = computed(() => dashboardStore.todayDynamics)
const taskBadgeCount = computed(() => tasks.value.filter((t) => t.status === 'pending').length)

function getPriorityType(priority: string) {
  const map: Record<string, any> = {
    urgent: 'danger',
    high: 'warning',
    normal: '',
    low: 'info',
  }
  return map[priority] || ''
}

function getTagType(tag: string) {
  if (tag === '高风险') return 'danger'
  if (tag === '聚合线索') return 'primary'
  if (tag === '支持起诉') return 'warning'
  return 'info'
}

function getHeatmapHeight(item: any) {
  if (heatmapType.value === 'count') return Math.min((item.value / 10) * 100, 100)
  if (heatmapType.value === 'amount') return Math.min((item.amount / 100000) * 100, 100)
  return Math.min((item.personCount / 50) * 100, 100)
}

function getHeatmapColor(item: any) {
  const height = getHeatmapHeight(item)
  if (height >= 70) return '#c01c28'
  if (height >= 40) return '#e5a50a'
  return '#26a269'
}

function getHeatmapValue(item: any) {
  if (heatmapType.value === 'count') return `${item.value} 条`
  if (heatmapType.value === 'amount') return `¥${((item.amount || 0) / 10000).toFixed(1)}万`
  return `${item.personCount} 人`
}

async function handleTaskClick(task: any) {
  if (task.bizType === 'clue') {
    router.push(`/clue/${task.bizId}`)
  } else if (task.bizType === 'case') {
    router.push(`/review/${task.bizId}`)
  } else {
    router.push(`/document/${task.bizId}`)
  }
}

onMounted(async () => {
  loading.value = true
  await dashboardStore.fetchAll()
  try {
    heatmapData.value = await clueApi.getHeatmap()
  } catch (e) {
    console.error('Failed to load heatmap', e)
  }
  loading.value = false
})
</script>

<style scoped>
.dashboard-page {
  padding: 0;
  background: var(--color-bg-page);
}

/* 顶部通栏 */
.page-header-full {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1a5fb4, #0d3a7a);
  color: #fff;
  padding: 20px 24px;
  margin: -16px -16px 16px -16px;
}

.system-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.org-name {
  font-size: 13px;
  opacity: 0.8;
  margin-left: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
}

.task-badge {
  cursor: pointer;
}

/* 指标网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.metric-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.metric-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.metric-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-pending .metric-icon { background: #fce8e8; color: #c01c28; }
.metric-key .metric-icon { background: #fef7e0; color: #8a6d00; }
.metric-processing .metric-icon { background: var(--color-primary-bg); color: #1a5fb4; }
.metric-closed .metric-icon { background: #e0f7ec; color: #26a269; }

.metric-content {
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.metric-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.metric-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

/* 业务区 */
.business-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.card {
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.card-full {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 任务列表 */
.task-list {
  padding: 12px;
  max-height: 280px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--color-border-light);
}

.task-item:last-child {
  border-bottom: none;
}

.task-item:hover {
  background: var(--color-bg-page);
}

.task-item.overdue {
  border-left: 3px solid var(--color-danger);
}

.task-left {
  display: flex;
  gap: 6px;
}

.task-title {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.task-actions {
  display: flex;
  gap: 8px;
}

/* 今日动态 */
.dynamics-list {
  padding: 8px 12px;
  max-height: 200px;
  overflow-y: auto;
}

.dynamics-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  font-size: 13px;
}

.dynamics-item:last-child {
  border-bottom: none;
}

.dynamics-item:hover {
  color: var(--color-primary);
}

.dynamics-clue-no {
  color: var(--color-primary);
  font-weight: 500;
  white-space: nowrap;
}

.dynamics-name {
  color: var(--color-text-primary);
  min-width: 60px;
}

.dynamics-project {
  color: var(--color-text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dynamics-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 热力图 */
.heatmap-container {
  padding: 20px;
  height: 340px;
}

.heatmap-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  gap: 8px;
}

.heatmap-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  max-width: 48px;
  background: #f0f0f0;
  border-radius: 4px 4px 0 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
  min-height: 4px;
}

.bar-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.bar-value {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
  text-align: center;
}

/* 风险预警 */
.risk-warning-card {
  margin-bottom: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--color-text-muted);
  gap: 8px;
}
</style>
