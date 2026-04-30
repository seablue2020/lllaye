import request from '@/utils/request'

export interface HeatmapCase {
  id: string
  clueNo: string
  projectName: string
  subjectName: string
  amount: number
  personCount: number
  riskLevel: string
  status: string
  createdAt: string
}

export interface HeatmapRegion {
  name: string
  district: string
  value: number
  amount: number
  personCount: number
  highRisk: number
  mediumRisk: number
  severityScore: number
  latestCases: HeatmapCase[]
}

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request.post<{
      accessToken: string
      refreshToken: string
      user: any
      expiresIn: string
    }>('/auth/login', data),

  logout: () => request.post('/auth/logout'),

  getProfile: () =>
    request.get<{
      id: string
      username: string
      realName: string
      phone: string
      role: string
      roleCode: string
      org: { id: string; name: string }
    }>('/auth/profile'),
}

export const dashboardApi = {
  getMetrics: () =>
    request.get<{
      pendingClues: number
      pendingCluesNew: number
      keyClues: number
      keyCluesOverdue: number
      processingCases: number
      processingCasesNew: number
      closedCases: number
      adoptionRate: number
    }>('/dashboard/metrics'),

  getTasks: () =>
    request.get<
      {
        id: string
        type: string
        typeLabel: string
        title: string
        description: string
        bizId: string
        bizType: string
        priority: string
        priorityLabel: string
        status: string
        dueDate: string
        createdAt: string
        isOverdue: boolean
      }[]
    >('/dashboard/tasks'),

  getRiskWarnings: () =>
    request.get<
      {
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
      }[]
    >('/dashboard/risk-warnings'),

  getTodayDynamics: () =>
    request.get<
      {
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
      }[]
    >('/dashboard/dynamics'),
}

export const clueApi = {
  list: (params: any) =>
    request.get<{ list: any[]; total: number; page: number; pageSize: number }>('/clues', params),

  getById: (id: string) => request.get<any>(`/clues/${id}`),

  getHeatmap: () => request.get<HeatmapRegion[]>('/clues/heatmap'),

  triage: (id: string, data: any) => request.put(`/clues/${id}/triage`, data),

  aggregate: (data: any) => request.post('/clues/aggregate', data),

  getDuplicates: (id: string) => request.get<any[]>(`/clues/duplicates/${id}`),

  getTimeline: (id: string) =>
    request.get<{
      clueNo: string
      records: {
        node: string
        action: string
        operatorName: string
        opinion: string
        status: string
        createdAt: string
      }[]
    }>(`/clues/${id}/timeline`),
}

export const caseApi = {
  list: (params?: any) =>
    request.get<{ list: any[]; total: number; page: number; pageSize: number }>('/case/list', params),
  getById: (id: string) => request.get<any>(`/case/${id}`),
  create: (data: any) => request.post<any>('/case', data),
}

export const reviewApi = {
  start: (clueId: string) => request.post(`/reviews/${clueId}/start`, undefined, { timeout: 120000 }),

  getResults: (caseId: string) =>
    request.get<{
      all: any[]
      confirmed: any[]
      pending: any[]
      confirmedCount: number
      totalCount: number
    }>(`/reviews/${caseId}/results`),

  confirm: (caseId: string, dimension?: string) =>
    request.post(`/reviews/${caseId}/confirm`, { dimension }),

  reject: (reviewId: string, reason: string) =>
    request.post(`/reviews/results/${reviewId}/reject`, { reason }),

  getReport: (caseId: string) =>
    request.get<{ report: string }>(`/reviews/${caseId}/report`, undefined, { timeout: 120000 }),

  getGuidance: (caseId: string) => request.get<any>(`/reviews/${caseId}/guidance`),
}

export const aiApi = {
  polishClaim: (originalText: string) =>
    request.post<{ result: string }>('/ai/polish-claim', { originalText }, { timeout: 60000 }),

  reviewCase: (data: any) => request.post('/ai/review', data, { timeout: 120000 }),

  generateDocument: (data: any) => request.post('/ai/generate-document', data, { timeout: 120000 }),
}

export const documentApi = {
  list: (caseId?: string) => request.get<any[]>('/documents', { caseId }),
  getById: (id: string) => request.get<any>(`/documents/${id}`),
  getTemplates: (category?: string) => request.get<any[]>('/documents/templates', { category }),
  generate: (caseId: string, templateId: string) =>
    request.post<any>('/documents/generate', { caseId, templateId }),
  update: (id: string, content: string) => request.put(`/documents/${id}`, { content }),
  submit: (id: string) => request.post(`/documents/${id}/submit`),
  approve: (id: string, opinion: string, signatureUrl?: string) =>
    request.post(`/documents/${id}/approve`, { opinion, signatureUrl }),
  reject: (id: string, opinion: string) => request.post(`/documents/${id}/reject`, { opinion }),
  archive: (id: string) => request.post(`/documents/${id}/archive`),
  getVersions: (id: string) => request.get<any[]>(`/documents/${id}/versions`),
}

export const batchApi = {
  getAggregates: () => request.get<any[]>('/batch/aggregates'),
  create: (data: { name: string; dimension: string; clueIds: string[] }) =>
    request.post('/batch/aggregate', data),
  process: (id: string, action: string) => request.post(`/batch/${id}/process`, { action }),
  split: (id: string, clueIds: string[]) => request.put(`/batch/${id}/split`, { clueIds }),
  close: (id: string) => request.put(`/batch/${id}/close`),
  getSimilarCases: (projectName: string) =>
    request.get<any[]>(`/batch/similar/${encodeURIComponent(projectName)}`),
}

export const statisticsApi = {
  getOverview: (params?: any) => request.get<any>('/statistics/overview', params),
  getRegionAnalysis: (params?: any) => request.get<any>('/statistics/region', params),
  getQualityAnalysis: (params?: any) => request.get<any>('/statistics/quality', params),
  getTrend: (period?: 'day' | 'week' | 'month', limit?: number) =>
    request.get<any[]>('/statistics/trend', { period, limit }),
}

export const systemApi = {
  getUsers: (params?: any) =>
    request.get<{ list: any[]; total: number; page: number; pageSize: number }>('/system/users', params),
  createUser: (data: any) => request.post('/system/users', data),
  updateUser: (id: string, data: any) => request.put(`/system/users/${id}`, data),
  deleteUser: (id: string) => request.delete(`/system/users/${id}`),
  getRoles: () => request.get<any[]>('/system/roles'),
  createRole: (data: any) => request.post('/system/roles', data),
  updateRole: (id: string, data: any) => request.put(`/system/roles/${id}`, data),
  getOrgs: () => request.get<any[]>('/system/orgs'),
  getDictionaries: (type?: string) => request.get<any[]>('/system/dictionaries', { type }),
  createDictionary: (data: any) => request.post('/system/dictionaries', data),
  updateDictionary: (id: string, data: any) => request.put(`/system/dictionaries/${id}`, data),
  getAuditLogs: (params?: any) =>
    request.get<{ list: any[]; total: number; page: number; pageSize: number }>(
      '/system/audit-logs',
      params
    ),
}
