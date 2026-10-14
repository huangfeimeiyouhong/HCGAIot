/**
 * 认证 API 层（当前为 mock 实现，延迟 200ms）
 *
 * 接入真实后端三步：
 *   1. 安装 axios，在 vite.config.ts 打开 /api 代理；
 *   2. 将下方各方法体替换为真实请求（如 POST /api/auth/login）；
 *   3. 返回数据结构保持不变，上层页面零改动。
 *
 * 数据隔离：本模块只负责登录态，不涉及业务集合，无需注入 scope。
 */
import { DEMO_ACCOUNTS, findDemoAccount } from '@/constants/demoAccounts';

import { delay } from '@/mock/delay';
import { getDb } from '@/mock/db';

import type { DemoAccount } from '@/constants/demoAccounts';
import type { LoginResult, Role, SessionUser } from '@/types';

/** 登录页下拉需要的账号公开信息（不含 password） */
export type DemoAccountPublic = Omit<DemoAccount, 'password'>;

/**
 * 取演示账号列表
 * @param role 入口角色；不传返回全部
 * @returns 演示账号列表
 */
export function getDemoAccounts(role?: Role): Promise<DemoAccountPublic[]> {
  const list = role ? DEMO_ACCOUNTS.filter((a) => a.role === role) : DEMO_ACCOUNTS;
  return delay(list.map(({ password: _pw, ...rest }) => rest));
}

/**
 * 登录（mock：任意非空密码通过）
 * @param payload 账号、密码、角色
 * @returns 登录结果（token + 用户信息）
 */
export function login(payload: { account: string; password: string; role: Role }): Promise<LoginResult> {
  if (!payload.account || !payload.password) {
    return Promise.reject(new Error('账号与密码不能为空'));
  }
  const demo = findDemoAccount(payload.account);
  if (!demo) return Promise.reject(new Error('账号不存在，请使用演示账号登录'));
  if (demo.role !== payload.role) {
    return Promise.reject(new Error('账号与所选入口不匹配'));
  }
  const user = toSessionUser(demo);
  return delay({ token: `mock-token-${demo.account}`, user });
}

/** 登出（mock 仅返回成功） */
export function logout(): Promise<void> {
  return delay(undefined);
}

/**
 * 取当前会话用户（mock 从 token 反查）
 * @param token 会话 token
 * @returns 会话用户；token 无效返回 null
 */
export function getCurrentUser(token: string): Promise<SessionUser | null> {
  const account = token.replace(/^mock-token-/, '');
  const demo = findDemoAccount(account);
  return delay(demo ? toSessionUser(demo) : null);
}

/**
 * 把演示账号定义转成会话用户
 * @param demo 演示账号
 * @returns 会话用户
 */
function toSessionUser(demo: DemoAccount): SessionUser {
  const db = getDb();
  const tenant = db.tenants.find((t) => t.id === demo.tenantId);
  // 未入驻厂家在租户表里可能仍是 DRAFT，此处以演示账号上的 onboardingStatus 为准
  const onboardingStatus = demo.role === 'VENDOR' ? demo.onboardingStatus ?? null : null;
  return {
    account: demo.account,
    displayName: demo.displayName,
    role: demo.role,
    accountRole: demo.accountRole,
    tenantId: demo.role === 'PLATFORM' ? 'PLATFORM' : demo.tenantId,
    tenantName: tenant?.name ?? demo.displayName,
    vendorId: demo.vendorId ?? null,
    vendorType: demo.vendorType ?? null,
    onboardingStatus,
  };
}

/** 认证 API 对象 */
export const authApi = {
  getDemoAccounts,
  login,
  logout,
  getCurrentUser,
};