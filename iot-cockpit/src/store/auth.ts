import { defineStore } from 'pinia';

/**
 * 认证 store —— 模板默认 mock 放行模式,不含任何真实 SSO 依赖
 *
 * 接入真实 SSO 时(两步):
 *   1. .env 中将 VITE_AUTH_MODE 改为 sso
 *   2. 在 ensureLoggedIn() 的 sso 分支中替换为真实 SSO SDK 的
 *      登录态校验逻辑(未登录时跳转 SSO 登录页,已登录写入 token/userInfo)
 *
 * 大屏多为内网/展厅场景,模板默认放行即可;页面需要展示用户名时
 * 从 authStore.userInfo 读取,mock 模式返回固定演示用户。
 */

export interface UserInfo {
  userId: string;
  userName: string;
  avatar?: string;
  [key: string]: any;
}

type State = {
  token: string;
  userInfo: UserInfo | null;
};

/** mock 模式的固定演示用户,不发起任何请求 */
const MOCK_USER: UserInfo = {
  userId: 'demo-001',
  userName: '演示用户',
};

export const useAuthStore = defineStore('_auth', {
  state: (): State => ({
    token: '',
    userInfo: null,
  }),
  getters: {
    isLoggedIn: (s) => Boolean(s.token),
  },
  actions: {
    /**
     * 登录态校验(由 src/permission.ts 路由守卫调用)
     * mock 模式: 直接写入演示用户并放行
     */
    async ensureLoggedIn(): Promise<boolean> {
      if (this.isLoggedIn) return true;

      if (import.meta.env.VITE_AUTH_MODE === 'sso') {
        // TODO: 接入真实 SSO,示例:
        //   const info = await ssoSdk.checkLogin({ redirect: window.location.href });
        //   this.token = info.token;
        //   this.userInfo = info.user;
        //   return true;
        console.warn('[auth] VITE_AUTH_MODE=sso 但未实现真实 SSO 校验,当前按 mock 放行');
      }

      this.token = 'mock-token';
      this.userInfo = MOCK_USER;
      return true;
    },

    /** 退出登录: mock 模式仅清空本地态;真实 SSO 替换为 SDK 的 logout/跳转 */
    async logout() {
      this.token = '';
      this.userInfo = null;
    },
  },
});
