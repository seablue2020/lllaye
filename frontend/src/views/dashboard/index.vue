<template>
  <div class="dashboard-page">
    <div class="page-header-full">
      <div class="header-left">
        <h2 class="system-title">欠薪支持起诉智能办案平台（检察端）</h2>
        <span class="org-name">{{ userStore.orgName || '北京市西城区人民检察院' }}</span>
      </div>
      <div class="header-right">
        <span class="user-name">{{ userStore.userName }}</span>
        <el-tag size="small">{{ userStore.role }}</el-tag>
        <el-badge :value="taskBadgeCount" :hidden="taskBadgeCount === 0" class="task-badge">
          <el-button text size="small">待办任务</el-button>
        </el-badge>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card metric-pending" @click="router.push('/clue?status=pending_review')">
        <div class="metric-icon"><el-icon :size="32"><Clock /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-high">{{ metrics?.pendingClues ?? '-' }}</div>
          <div class="metric-label">待研判线索总数</div>
          <div class="metric-sub">今日新增 {{ metrics?.pendingCluesNew ?? 0 }} 条</div>
        </div>
      </div>

      <div class="metric-card metric-key" @click="router.push('/clue?isKey=true')">
        <div class="metric-icon"><el-icon :size="32"><Warning /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-medium">{{ metrics?.keyClues ?? '-' }}</div>
          <div class="metric-label">重点线索</div>
          <div class="metric-sub">超期预警 {{ metrics?.keyCluesOverdue ?? 0 }} 条</div>
        </div>
      </div>

      <div class="metric-card metric-processing" @click="router.push('/review')">
        <div class="metric-icon"><el-icon :size="32"><Collection /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-medium">{{ metrics?.processingCases ?? '-' }}</div>
          <div class="metric-label">AI审查案件总数</div>
          <div class="metric-sub">本月新建 {{ metrics?.processingCasesNew ?? 0 }} 件</div>
        </div>
      </div>

      <div class="metric-card metric-closed">
        <div class="metric-icon"><el-icon :size="32"><CircleCheck /></el-icon></div>
        <div class="metric-content">
          <div class="metric-value risk-low">{{ metrics?.closedCases ?? '-' }}</div>
          <div class="metric-label">已办结案件数</div>
          <div class="metric-sub">采纳率 {{ metrics?.adoptionRate ?? 0 }}%</div>
        </div>
      </div>
    </div>

    <div class="business-area">
      <div class="area-left">
        <div class="card">
          <div class="card-header">
            <span class="card-title">我的办案任务</span>
            <el-tag type="primary" size="small">{{ tasks.length }} 项</el-tag>
          </div>
          <div class="task-list" v-loading="loading">
            <div v-if="tasks.length === 0" class="empty-state">
              <el-icon :size="40" color="#d0d0d0"><SuccessFilled /></el-icon>
              <p>暂无办案任务</p>
            </div>
            <div
              v-for="task in tasks"
              :key="task.id"
              class="task-item"
              :class="{ overdue: task.isOverdue }"
              @click="handleTaskClick(task)"
            >
              <div class="task-topline">
                <div class="task-left">
                  <el-tag size="small" :type="getPriorityType(task.priority)">
                    {{ task.priorityLabel }}
                  </el-tag>
                  <el-tag size="small" type="info">{{ task.typeLabel }}</el-tag>
                </div>
                <span class="task-date">{{ formatTaskDate(task.dueDate || task.createdAt) }}</span>
              </div>
              <div class="task-title">{{ task.title }}</div>
              <div class="task-desc">{{ task.description || getBizTypeLabel(task.bizType) }}</div>
              <div class="task-actions">
                <el-button type="primary" size="small" text @click.stop="handleTaskClick(task)">立即办理</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="card dynamics-card">
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
              <p>暂无今日线索动态</p>
            </div>
          </div>
        </div>
      </div>

      <div class="area-right">
        <div class="card card-full">
          <div class="card-header">
            <span class="card-title">北京市案发地点分布图</span>
            <el-select v-model="heatmapType" size="small" class="heatmap-select">
              <el-option label="按线索数" value="count" />
              <el-option label="按金额" value="amount" />
              <el-option label="按人数" value="person" />
              <el-option label="按严重度" value="severity" />
            </el-select>
          </div>
          <div class="map-shell">
            <div v-if="heatmapData.length === 0" class="empty-state map-empty">
              <el-icon :size="48" color="#d0d0d0"><MapLocation /></el-icon>
              <p>暂无地图数据</p>
            </div>
            <div ref="mapRef" class="beijing-map"></div>
            <div class="map-side-panel">
              <div class="selected-title">{{ selectedRegion?.district || '选择区县' }}</div>
              <div class="selected-summary" v-if="selectedRegion">
                <div><strong>{{ selectedRegion.value }}</strong><span>线索</span></div>
                <div><strong>{{ formatCurrency(selectedRegion.amount) }}</strong><span>欠薪金额</span></div>
                <div><strong>{{ selectedRegion.personCount }}</strong><span>涉及人数</span></div>
                <div><strong>{{ selectedRegion.highRisk }}</strong><span>高风险</span></div>
              </div>
              <div v-if="selectedRegion?.latestCases?.length" class="latest-list">
                <div class="latest-title">最近线索</div>
                <div
                  v-for="item in selectedRegion.latestCases"
                  :key="item.id"
                  class="latest-item"
                  @click="router.push(`/clue/${item.id}`)"
                >
                  <div class="latest-main">
                    <span>{{ item.clueNo }}</span>
                    <el-tag size="small" :type="getRiskTag(item.riskLevel)">{{ getRiskLabel(item.riskLevel) }}</el-tag>
                  </div>
                  <div class="latest-project">{{ item.projectName }}</div>
                  <div class="latest-meta">
                    {{ formatCurrency(item.amount) }} / {{ item.personCount }}人 / {{ formatDate(item.createdAt) }}
                  </div>
                </div>
              </div>
              <div v-else class="empty-latest">点击区县查看最近线索</div>
            </div>
          </div>
          <div class="map-legend">
            <span><i class="legend-dot low"></i>低风险/少量</span>
            <span><i class="legend-dot medium"></i>中风险/较多</span>
            <span><i class="legend-dot high"></i>高风险/集中</span>
          </div>
        </div>
      </div>
    </div>

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
          <template #default="{ row }">{{ Number(row.amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="风险等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRiskTag(row.riskLevel)" size="small">{{ getRiskLabel(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警原因" min-width="240">
          <template #default="{ row }">
            <span>{{ row.riskReasonList?.join('；') || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" text @click="router.push(`/clue/${row.id}`)">优先办理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import {
  CircleCheck,
  Clock,
  Collection,
  MapLocation,
  SuccessFilled,
  Warning,
  WarningFilled,
} from '@element-plus/icons-vue'
import { clueApi } from '@/api'
import type { HeatmapRegion } from '@/api'
import { useDashboardStore } from '@/stores/dashboard'
import { useUserStore } from '@/stores/user'
import beijingMap from '@/assets/maps/beijing.json'

const router = useRouter()
const dashboardStore = useDashboardStore()
const userStore = useUserStore()

const loading = ref(false)
const heatmapType = ref<'count' | 'amount' | 'person' | 'severity'>('count')
const heatmapData = ref<HeatmapRegion[]>([])
const selectedDistrict = ref('')
const mapRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const metrics = computed(() => dashboardStore.metrics)
const tasks = computed(() => dashboardStore.tasks)
const riskWarnings = computed(() => dashboardStore.riskWarnings)
const todayDynamics = computed(() => dashboardStore.todayDynamics)
const taskBadgeCount = computed(() => tasks.value.filter((item) => item.status === 'pending').length)
const selectedRegion = computed(() => heatmapData.value.find((item) => item.district === selectedDistrict.value))

function getPriorityType(priority: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' | undefined {
  const map: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger' | undefined> = {
    urgent: 'danger',
    high: 'warning',
    normal: undefined,
    low: 'info',
  }
  return map[priority]
}

function getTagType(tag: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' | undefined {
  if (tag === '高风险') return 'danger'
  if (tag === '联合线索') return 'primary'
  if (tag === '支持起诉') return 'warning'
  return 'info'
}

function getRiskTag(riskLevel: string): 'success' | 'warning' | 'danger' {
  if (riskLevel === 'high') return 'danger'
  if (riskLevel === 'medium') return 'warning'
  return 'success'
}

function getRiskLabel(riskLevel: string) {
  if (riskLevel === 'high') return '高风险'
  if (riskLevel === 'medium') return '中风险'
  return '低风险'
}

function getBizTypeLabel(bizType: string) {
  const labels: Record<string, string> = {
    clue: '线索办理',
    case: '案件办理',
    document: '文书办理',
  }
  return labels[bizType] || '办案任务'
}

function formatCurrency(value: number) {
  return `${(Number(value || 0) / 10000).toFixed(1)}万`
}

function formatDate(value: string) {
  return dayjs(value).format('MM-DD')
}

function formatTaskDate(value: string) {
  return dayjs(value).format('MM-DD HH:mm')
}

function getMapValue(item: HeatmapRegion) {
  if (heatmapType.value === 'amount') return item.amount
  if (heatmapType.value === 'person') return item.personCount
  if (heatmapType.value === 'severity') return item.severityScore
  return item.value
}

function getVisualMax() {
  const values = heatmapData.value.map(getMapValue)
  return Math.max(...values, 1)
}

function renderMap() {
  if (!mapRef.value) return
  if (!chart) {
    echarts.registerMap('beijing', beijingMap as any)
    chart = echarts.init(mapRef.value)
    chart.on('click', (params) => {
      if (params.name) {
        selectedDistrict.value = params.name
      }
    })
  }

  const data = heatmapData.value.map((item) => ({
    name: item.district,
    value: getMapValue(item),
    raw: item,
  }))

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const raw = params.data?.raw as HeatmapRegion | undefined
        if (!raw) return `${params.name}<br/>暂无数据`
        return [
          `<strong>${raw.district}</strong>`,
          `线索：${raw.value}条`,
          `金额：${formatCurrency(raw.amount)}`,
          `人数：${raw.personCount}人`,
          `高风险：${raw.highRisk}条`,
        ].join('<br/>')
      },
    },
    visualMap: {
      min: 0,
      max: getVisualMax(),
      show: false,
      inRange: {
        color: ['#dff3e8', '#f3c969', '#c01c28'],
      },
    },
    series: [
      {
        type: 'map',
        map: 'beijing',
        roam: false,
        selectedMode: 'single',
        label: {
          show: true,
          color: '#243442',
          fontSize: 11,
        },
        emphasis: {
          label: { color: '#111827', fontWeight: 700 },
          itemStyle: { areaColor: '#f59e0b' },
        },
        select: {
          itemStyle: { areaColor: '#2f80ed' },
          label: { color: '#fff' },
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 1,
          areaColor: '#edf2f7',
        },
        data,
      },
    ],
  })
}

function handleTaskClick(task: { bizType: string; bizId: string }) {
  if (task.bizType === 'clue') {
    router.push(`/clue/${task.bizId}`)
  } else if (task.bizType === 'case') {
    router.push(`/review/${task.bizId}`)
  } else {
    router.push(`/document/${task.bizId}`)
  }
}

function resizeMap() {
  chart?.resize()
}

watch(heatmapType, () => renderMap())
watch(heatmapData, () => {
  if (!selectedDistrict.value && heatmapData.value.length) {
    selectedDistrict.value = heatmapData.value[0].district
  }
  nextTick(renderMap)
})

onMounted(async () => {
  loading.value = true
  await dashboardStore.fetchAll()
  try {
    heatmapData.value = await clueApi.getHeatmap()
  } catch (error) {
    console.error('Failed to load heatmap', error)
    ElMessage.error('地图数据加载失败')
  } finally {
    loading.value = false
  }
  window.addEventListener('resize', resizeMap)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeMap)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.dashboard-page {
  padding: 0;
  background: var(--color-bg-page);
}

.page-header-full {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1a5fb4, #0d3a7a);
  color: #fff;
  padding: 20px 30px 8px;
  height: 84px;
  margin: -16px -16px 16px -16px;
}

.system-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.org-name {
  font-size: 13px;
  opacity: 0.85;
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

.task-badge :deep(.el-button span) {
  color: rgba(255, 255, 255, 1);
}

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
  border-radius: 8px;
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

.business-area {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.3fr);
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

.task-list {
  padding: 12px;
  max-height: 320px;
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

.task-topline,
.task-left,
.task-actions,
.dynamics-tags {
  display: flex;
  gap: 6px;
}

.task-topline {
  justify-content: space-between;
  align-items: center;
}

.task-date {
  color: var(--color-text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.task-title {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.task-desc {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.35;
}

.dynamics-card {
  margin-top: 16px;
}

.dynamics-list {
  padding: 8px 12px;
  max-height: 220px;
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
  flex-shrink: 0;
}

.heatmap-select {
  width: 128px;
}

.map-shell {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) 260px;
  gap: 16px;
  padding: 16px 20px 10px;
  min-height: 560px;
  position: relative;
}

.beijing-map {
  width: 100%;
  height: 520px;
  min-width: 0;
}

.map-empty {
  position: absolute;
  inset: 16px 296px 10px 20px;
  z-index: 1;
  background: rgba(255, 255, 255, 0.86);
}

.map-side-panel {
  border-left: 1px solid var(--color-border-light);
  padding-left: 16px;
  min-width: 0;
}

.selected-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.selected-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.selected-summary div {
  background: var(--color-bg-page);
  border-radius: 6px;
  padding: 8px;
}

.selected-summary strong {
  display: block;
  font-size: 16px;
  color: var(--color-text-primary);
}

.selected-summary span {
  font-size: 12px;
  color: var(--color-text-muted);
}

.latest-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.latest-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
}

.latest-item:hover .latest-project {
  color: var(--color-primary);
}

.latest-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 600;
}

.latest-project {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.latest-meta,
.empty-latest {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.map-legend {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 20px 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.legend-dot.low { background: #26a269; }
.legend-dot.medium { background: #e5a50a; }
.legend-dot.high { background: #c01c28; }

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

.risk-high {
  color: var(--color-danger);
  font-weight: 700;
}

@media (max-width: 1200px) {
  .business-area {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .map-shell {
    grid-template-columns: 1fr;
  }

  .map-side-panel {
    border-left: none;
    border-top: 1px solid var(--color-border-light);
    padding-left: 0;
    padding-top: 12px;
  }
}
</style>
