/**
 * useScope —— 组件侧读取当前租户范围（reactive）
 * 依赖 mock/scope.ts 的 resolveScope，scope 随登录态变化自动重算
 */
import { computed } from 'vue';

import { resolveScope } from '@/mock/scope';
import { useAuthStore } from '@/store/auth';

import type { Scope } from '@/mock/types';
import type { ComputedRef } from 'vue';

/**
 * 当前数据范围（computed，随登录态与内存数据变化）
 * @returns Scope 的只读视图
 */
export function useScope(): ComputedRef<Scope> {
  const auth = useAuthStore();
  return computed(() => resolveScope(auth));
}