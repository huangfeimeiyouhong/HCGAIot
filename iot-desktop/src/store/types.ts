/**
 * store 层共享类型
 * ⚠️ 本文件是 mock/scope.ts 依赖的唯一 store 类型来源（结构化类型），
 *    使 mock 层不 import store/auth.ts，彻底断开 mock → store 的反向依赖（约定 2 / 硬性规则 3）
 */
import type { Role, VendorType } from '@/types';

/** authStore 的最小结构化视图（resolveScope 只需这些字段） */
export interface AuthStoreLike {
  role: Role | null;
  tenantId: string | null;
  vendorId: string | null;
  vendorType: VendorType | null;
}

/** 筛选状态存储值 */
export type FiltersMap = Record<string, Record<string, unknown>>;