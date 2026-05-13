<template>
  <div class="statistics-page page-container">
    <div class="page-header">
      <h2 class="page-title">数据统计</h2>
      <div class="btn-group">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="default" />
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="handleExport"><el-icon><Download /></el-icon>导出报表</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="综合统计报表" name="overview">
        <el-row :gutter="16" class="summary-cards">
          <el-col :span="6"><div class="metric-card"><div class="metric-value">{{ overview?.summary?.totalClues || 0 }}</div><div class="metric-label">线索总量</div></div></el-col>
          <el-col :span="6"><div class="metric-card"><div class="metric-value">{{ overview?.summary?.pendingClues || 0 }}</div><div class="metric-label">待处理线索</div></div></el-col>
          <el-col :span="6"><div class="metric-card"><div class="metric-value">{{ overview?.caseSummary?.total || 0 }}</div><div class="metric-label">案件总数</div></div></el-col>
          <el-col :span="6"><div class="metric-card"><div class="metric-value">{{ overview?.caseSummary?.closedRate || 0 }}%</div><div class="metric-label">办结率</div></div></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="card">
              <div class="card-title">线索来源分布</div>
              <div ref="sourceChartRef" style="height: 280px"></div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="card">
              <div class="card-title">诉求类型分布</div>
              <div ref="claimTypeChartRef" style="height: 280px"></div>
            </div>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="区域分析" name="region">
        <div class="card">
          <el-table :data="regionData?.topRegions || []" stripe>
            <el-table-column prop="region" label="区域" />
            <el-table-column prop="count" label="线索数" align="center" />
            <el-table-column label="涉案金额" align="right">
              <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="totalPerson" label="涉及人数" align="center" />
            <el-table-column prop="highRisk" label="高风险线索" align="center">
              <template #default="{ row }"><span :class="row.highRisk > 0 ? 'risk-high' : ''">{{ row.highRisk }}</span></template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="办案质效" name="quality">
        <el-row :gutter="16" class="summary-cards">
          <el-col :span="6"><div class="metric-card"><div class="metric-value">{{ quality?.avgDuration || 0 }}</div><div class="metric-label">平均办结时长(天)</div></div></el-col>
          <el-col :span="6"><div class="metric-card"><div class="metric-value">{{ quality?.closedCases || 0 }}</div><div class="metric-label">已结案件</div></div></el-col>
          <el-col :span="6"><div class="metric-card"><div class="metric-value">{{ quality?.adoptionRate || 0 }}%</div><div class="metric-label">采纳率</div></div></el-col>
        </el-row>
        <div class="card" style="margin-top: 16px">
          <div class="card-title">检察官办案工作量</div>
          <el-table :data="quality?.prosecutorWorkload || []" stripe>
            <el-table-column prop="name" label="检察官" />
            <el-table-column prop="count" label="办案数量" align="center" />
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { statisticsApi } from '@/api'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const CHART_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4']

const activeTab = ref('overview')
const dateRange = ref<[Date, Date]>([dayjs().subtract(30, 'day').toDate(), new Date()])
const loading = ref(false)

const overview = ref<any>(null)
const regionData = ref<any>(null)
const quality = ref<any>(null)
const sourceChartRef = ref<HTMLElement>()
const claimTypeChartRef = ref<HTMLElement>()

let sourceChart: echarts.ECharts | null = null
let claimTypeChart: echarts.ECharts | null = null

async function loadData() {
  loading.value = true
  try {
    const [ovRes, rgRes, qlRes] = await Promise.all([
      statisticsApi.getOverview({ startDate: dateRange.value[0]?.toISOString(), endDate: dateRange.value[1]?.toISOString() }),
      statisticsApi.getRegionAnalysis({}),
      statisticsApi.getQualityAnalysis({}),
    ])
    overview.value = ovRes
    regionData.value = rgRes
    quality.value = qlRes
    await nextTick()
    renderCharts()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function renderCharts() {
  renderSourceChart()
  renderClaimTypeChart()
}

function renderSourceChart() {
  if (!sourceChartRef.value) return
  const data = overview.value?.sourceDistribution || []
  if (data.length === 0) {
    sourceChartRef.value.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#909399;font-size:14px">暂无数据</div>'
    return
  }
  if (!sourceChart) {
    sourceChart = echarts.init(sourceChartRef.value)
  }
  sourceChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}条 ({d}%)' },
    legend: { bottom: '3%', left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}条' },
      data: data.map((item: any, index: number) => ({
        name: item.label,
        value: item.count,
        itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
      })),
    }],
  })
}

function renderClaimTypeChart() {
  if (!claimTypeChartRef.value) return
  const data = overview.value?.claimTypeDistribution || []
  if (data.length === 0) {
    claimTypeChartRef.value.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#909399;font-size:14px">暂无数据</div>'
    return
  }
  if (!claimTypeChart) {
    claimTypeChart = echarts.init(claimTypeChartRef.value)
  }
  claimTypeChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}条 ({d}%)' },
    legend: { bottom: '3%', left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}条' },
      data: data.map((item: any, index: number) => ({
        name: item.label,
        value: item.count,
        itemStyle: { color: CHART_COLORS[(index + 4) % CHART_COLORS.length] },
      })),
    }],
  })
}

function resizeCharts() {
  sourceChart?.resize()
  claimTypeChart?.resize()
}

function handleExport() { ElMessage.info('导出功能开发中') }

onMounted(() => {
  loadData()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  sourceChart?.dispose()
  claimTypeChart?.dispose()
  window.removeEventListener('resize', resizeCharts)
})
</script>

<style scoped>
.statistics-page { background: var(--color-bg-page); }

.summary-cards { margin-bottom: 16px; }

.metric-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.metric-value { font-size: 28px; font-weight: 700; color: var(--color-primary); }
.metric-label { font-size: 13px; color: var(--color-text-muted); margin-top: 8px; }

.card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}

.card-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }

.risk-high { color: var(--color-risk-high); font-weight: 600; }
</style>
