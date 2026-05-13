import { defineStore } from 'pinia'
import { dashboardApi } from '@/api'

interface DashboardMetrics {
  pendingClues: number
  pendingCluesNew: number
  keyClues: number
  keyCluesOverdue: number
  processingCases: number
  processingCasesNew: number
  closedCases: number
  adoptionRate: number
}

interface Task {
  id: string
  type: string
  typeLabel: string
  title: string
  description: string | null
  bizId: string
  bizType: string
  priority: string
  priorityLabel: string
  status: string
  dueDate: string | null
  createdAt: string
  isOverdue: boolean
}

interface RiskWarning {
  id: string
  clueNo: string
  subjectName: string
  personCount: number
  amount: number
  riskLevel: string
  riskReasonList: string[]
  projectName: string
  status: string
  createdAt: string
}

interface DynamicClue {
  id: string
  clueNo: string
  applicantName: string
  subjectName: string
  projectName: string
  claimType: string
  riskLevel: string
  isAggregated: boolean
  status: string
  tags: string[]
  createdAt: string
}

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    metrics: null as DashboardMetrics | null,
    tasks: [] as Task[],
    riskWarnings: [] as RiskWarning[],
    todayDynamics: [] as DynamicClue[],
    loading: false,
  }),

  actions: {
    async fetchMetrics() {
      try {
        this.metrics = await dashboardApi.getMetrics()
      } catch (e) {
        console.error('Failed to fetch metrics', e)
      }
    },

    async fetchTasks() {
      try {
        this.tasks = await dashboardApi.getTasks()
      } catch (e) {
        console.error('Failed to fetch tasks', e)
      }
    },

    async fetchRiskWarnings() {
      try {
        this.riskWarnings = await dashboardApi.getRiskWarnings()
      } catch (e) {
        console.error('Failed to fetch risk warnings', e)
      }
    },

    async fetchTodayDynamics() {
      try {
        this.todayDynamics = await dashboardApi.getTodayDynamics()
      } catch (e) {
        console.error('Failed to fetch dynamics', e)
      }
    },

    async fetchAll() {
      this.loading = true
      await Promise.all([
        this.fetchMetrics(),
        this.fetchTasks(),
        this.fetchRiskWarnings(),
        this.fetchTodayDynamics(),
      ])
      this.loading = false
    },
  },
})
