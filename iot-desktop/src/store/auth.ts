import { defineStore } from 'pinia';

import { authApi } from '@/api/auth';

import type { OnboardingStatus, Role, SessionUser, VendorType } from '@/types';

type State = {
  token: string;
  userInfo: SessionUser | null;
  role: Role | null;
  tenantId: string | null;
  tenantName: string;
  vendorId: string | null;
  vendorType: VendorType | null;
  /** 厂家入驻状态（客户/平台为 null） */
  onboardingStatus: OnboardingStatus | null;
  /** 是否已放入内存态（mock 模式刷新即重置，不做持久化） */
  ready: boolean;
};

export const useAuthStore = defineStore('_auth', {
  state: (): State => ({
    token: '',
    userInfo: null,
    role: null,
    tenantId: null,
    tenantName: '',
    vendorId: null,
    vendorType: null,
    onboardingStatus: null,
    ready: false,
  }),

  getters: {
    /** 是否已登录 */
    isLoggedIn: (s): boolean => Boolean(s.token),
    /** 厂家是否已入驻（试运营或正式） */
    isBoundVendor: (s): boolean =>
      s.role === 'VENDOR' && (s.onboardingStatus === 'ACTIVE' || s.onboardingStatus === 'TRIAL'),
    /** 厂家是否处于试运营 */
    isTrialVendor: (s): boolean => s.role === 'VENDOR' && s.onboardingStatus === 'TRIAL',
    /** 厂家是否未入驻（可展示侧栏仅工作台 + 入驻申请） */
    isUnboundVendor: (s): boolean =>
      s.role === 'VENDOR' && s.onboardingStatus !== 'ACTIVE' && s.onboardingStatus !== 'TRIAL',
  },

  actions: {
    /**
     * 登录（mock：任意非空密码通过）
     * @param payload 账号、密码、角色
     * @returns 登录结果
     */
    async login(payload: { account: string; password: string; role: Role }) {
      const result = await authApi.login(payload);
      this.token = result.token;
      this.userInfo = result.user;
      this.role = result.user.role;
      this.tenantId = result.user.tenantId;
      this.tenantName = result.user.tenantName;
      this.vendorId = result.user.vendorId;
      this.vendorType = result.user.vendorType;
      this.onboardingStatus = result.user.onboardingStatus;
      this.ready = true;
      return result;
    },

    /**
     * 登出：清空登录态与入口相关缓存
     */
    async logout(): Promise<void> {
      await authApi.logout();
      this.token = '';
      this.userInfo = null;
      this.role = null;
      this.tenantId = null;
      this.tenantName = '';
      this.vendorId = null;
      this.vendorType = null;
      this.onboardingStatus = null;
      this.ready = true;
    },

    /**
     * 切换入口角色（架构文档 A10.1 S4：清登录态 + 带 role 跳登录页，不静默切换）
     * @param role 目标角色
     */
    switchRole(role: Role): void {
      this.token = '';
      this.userInfo = null;
      this.role = null;
      this.tenantId = null;
      this.tenantName = '';
      this.vendorId = null;
      this.vendorType = null;
      this.onboardingStatus = null;
      void role;
    },

    /**
     * 刷新入驻状态（入驻申请提交/流转后调用，让菜单与落地页跟着变）
     * @param status 最新入驻状态
     */
    setOnboardingStatus(status: OnboardingStatus | null): void {
      this.onboardingStatus = status;
      if (this.userInfo) this.userInfo.onboardingStatus = status;
    },

    /**
     * 登录态恢复（mock 内存态：刷新即失效，无需恢复，仅标记 ready）
     */
    markReady(): void {
      this.ready = true;
    },
  },
});