import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    requiresAuth?: boolean
    permission?: string[]
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '办案总览', icon: 'DataAnalysis' },
      },
      {
        path: 'clue',
        name: 'Clue',
        component: () => import('@/views/clue/index.vue'),
        meta: { title: '线索管理', icon: 'Search' },
      },
      {
        path: 'clue/:id',
        name: 'ClueDetail',
        component: () => import('@/views/clue/detail.vue'),
        meta: { title: '线索详情', parent: 'Clue' },
      },
      {
        path: 'review',
        name: 'Review',
        component: () => import('@/views/review/index.vue'),
        meta: { title: 'AI辅助审查', icon: 'Monitor' },
      },
      {
        path: 'review/:caseId',
        name: 'ReviewDetail',
        component: () => import('@/views/review/detail.vue'),
        meta: { title: '审查详情', parent: 'Review' },
      },
      {
        path: 'document',
        name: 'Document',
        component: () => import('@/views/document/index.vue'),
        meta: { title: '文书管理', icon: 'Document' },
      },
      {
        path: 'document/:id',
        name: 'DocumentEdit',
        component: () => import('@/views/document/edit.vue'),
        meta: { title: '文书编辑', parent: 'Document' },
      },
      {
        path: 'batch',
        name: 'Batch',
        component: () => import('@/views/batch/index.vue'),
        meta: { title: '批量办案', icon: 'Grid' },
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/statistics/index.vue'),
        meta: { title: '数据统计', icon: 'TrendCharts' },
      },
      {
        path: 'system',
        name: 'System',
        meta: { title: '系统管理', icon: 'Setting' },
        children: [
          {
            path: 'users',
            name: 'Users',
            component: () => import('@/views/system/users.vue'),
            meta: { title: '用户管理', permission: ['admin'] },
          },
          {
            path: 'roles',
            name: 'Roles',
            component: () => import('@/views/system/roles.vue'),
            meta: { title: '角色权限', permission: ['admin'] },
          },
          {
            path: 'dictionaries',
            name: 'Dictionaries',
            component: () => import('@/views/system/dictionaries.vue'),
            meta: { title: '字典配置', permission: ['admin'] },
          },
          {
            path: 'audit-logs',
            name: 'AuditLogs',
            component: () => import('@/views/system/audit-logs.vue'),
            meta: { title: '审计日志' },
          },
        ],
      },
    ],
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限' },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('access_token')
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

// 更新页面标题
router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} - 欠薪支持起诉智能办案平台` : '欠薪支持起诉智能办案平台'
})

export default router
