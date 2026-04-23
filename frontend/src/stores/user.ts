import { defineStore } from 'pinia'
import { authApi } from '@/api'
import type { RouteRecordRaw } from 'vue-router'

interface UserInfo {
  id: string
  username: string
  realName: string
  phone?: string
  role: string
  roleCode: string
  org?: { id: string; name: string }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('access_token') || '',
    refreshToken: localStorage.getItem('refresh_token') || '',
    userInfo: (() => {
      try {
        const stored = localStorage.getItem('user_info')
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    })() as UserInfo | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userName: (state) => state.userInfo?.realName || state.userInfo?.username || '',
    role: (state) => state.userInfo?.role || '',
    roleCode: (state) => state.userInfo?.roleCode || '',
    orgName: (state) => state.userInfo?.org?.name || '',
  },

  actions: {
    async login(username: string, password: string) {
      const result = await authApi.login({ username, password })
      this.token = result.accessToken
      this.refreshToken = result.refreshToken
      this.userInfo = result.user

      localStorage.setItem('access_token', result.accessToken)
      localStorage.setItem('refresh_token', result.refreshToken)
      localStorage.setItem('user_info', JSON.stringify(result.user))
    },

    async logout() {
      try {
        await authApi.logout()
      } catch {
        // ignore
      }
      this.token = ''
      this.refreshToken = ''
      this.userInfo = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_info')
    },

    async fetchProfile() {
      if (!this.token) return
      try {
        const profile = await authApi.getProfile()
        this.userInfo = profile
        localStorage.setItem('user_info', JSON.stringify(profile))
      } catch {
        this.logout()
      }
    },

    hasPermission(code: string): boolean {
      if (!this.userInfo) return false
      if (this.roleCode === 'admin') return true
      // 其他权限检查逻辑
      return true
    },
  },
})
