/**
 * 路由守卫 —— 登录态 + 角色匹配 + 厂家类型匹配 + 标题/缓存注册
 *
 * 四步（架构文档 A4.4）：
 *   ① 公共路由直通
 *   ② 未登录 → 跳登录页，带 redirect 与 role（从 to.path 首段推断）
 *   ③ 已登录但角色不匹配 → 403
 *   ④ 厂家类型不匹配 → Toast + 跳该端 dashboard
 */
import { ElMessage } from 'element-plus';
import type { Router } from 'vue-router';

import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useFilterStore } from '@/store/filters';

import { findDemoAccount } from '@/constants/demoAccounts';

import type { Role } from '@/types';

/** 路由 meta 类型扩展 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题（document.title + 顶栏标题 + keep-alive 缓存键） */
    title: string;
    /** 允许访问的角色；'public' 表示免登录 */
    role?: Role | 'public';
    /** 免登录即可访问 */
    public?: boolean;
    /** 侧边栏菜单图标（@element-plus/icons-vue 组件名） */
    icon?: string;
    /** 需要的厂家类型；不设则两者都可见 */
    vendorType?: 'COOKWARE' | 'IOT';
    /** 面包屑父级 path */
    parent?: string;
    /** 是否 keep-alive（列表页缓存，筛选条件由 store.filters 保留） */
    keepAlive?: boolean;
    /** 菜单内排序 */
    order?: number;
  }
}

/**
 * 由路由 path 首段推断角色（未登录跳登录时用）
 * @param path 路由 path
 * @returns 角色；无法推断返回 'platform'
 */
function roleOfPath(path: string): Role {
  const first = path.split('/')[1] ?? '';
  if (first === 'platform') return 'PLATFORM';
  if (first === 'vendor') return 'VENDOR';
  if (first === 'customer') return 'CUSTOMER';
  return 'PLATFORM';
}

/**
 * 注册路由守卫
 * @param router 路由实例
 */
export function setupGuard(router: Router): void {
  router.beforeEach((to) => {
    const auth = useAuthStore();

    // ① 公共路由直通
    if (to.meta.public || to.meta.role === 'public') {
      // 已登录时访问登录页 → 重定向到对应工作台（防重复登录）
      if (to.path === '/login' && auth.isLoggedIn) {
        return landingOf(auth.role, auth.onboardingStatus);
      }
      return true;
    }

    // ② 未登录 → 跳登录页
    if (!auth.isLoggedIn) {
      return { path: '/login', query: { role: roleOfPath(to.path).toLowerCase(), redirect: to.fullPath } };
    }

    // ③ 角色不匹配 → 403
    if (to.meta.role && to.meta.role !== auth.role) {
      return { path: '/403', query: { from: to.fullPath } };
    }

    // ④ 厂家类型不匹配 → Toast + 跳该端 dashboard
    if (to.meta.vendorType && to.meta.vendorType !== auth.vendorType) {
      ElMessage.warning('该功能仅对物联网厂家开放');
      return { path: '/vendor/dashboard' };
    }

    return true;
  });

  router.afterEach((to) => {
    const app = useAppStore();
    // 标题：页面级覆盖优先（详情页 onBeforeUnmount 置空）
    const title = app.pageTitle || to.meta.title || '后厨管家';
    document.title = `${title} · 后厨管家 AIoT`;
    app.pageTitle = '';

    // keep-alive 注册（LRU，include 消费）
    if (to.meta.keepAlive && to.name) {
      app.addKeepAlive(String(to.name));
    }
  });

  router.onError((error) => {
    // 动态 import 失败（页面文件缺失）时兜底，避免白屏无提示
    console.error('[router] 路由加载失败：', error);
    ElMessage.error('页面加载失败，请返回首页重试');
  });
}

/**
 * 计算登录后的落地页
 * @param role 角色
 * @param onboardingStatus 厂家入驻状态
 * @returns 落地路由 path
 */
export function landingOf(role: Role | null, onboardingStatus?: string | null): string {
  if (role === 'PLATFORM') {
    // 按演示账号各自的落地页生效（如审核员落审核列表，而非默认 dashboard）
    const account = useAuthStore().userInfo?.account;
    const demo = account ? findDemoAccount(account) : undefined;
    if (demo?.landing) return demo.landing;
    return '/platform/dashboard';
  }
  if (role === 'VENDOR') {
    // 未入驻 / 草稿态 → 落到入驻申请页（PRD 明确）
    if (onboardingStatus !== 'ACTIVE' && onboardingStatus !== 'TRIAL') return '/vendor/onboarding';
    return '/vendor/dashboard';
  }
  return '/customer/dashboard';
}

/**
 * 登出并返回入口选择页
 * @param router 路由实例
 */
export async function logoutAndBack(router: Router): Promise<void> {
  const auth = useAuthStore();
  const app = useAppStore();
  const filters = useFilterStore();
  await auth.logout();
  app.clearKeepAlive();
  filters.clearAll();
  await router.push('/');
}