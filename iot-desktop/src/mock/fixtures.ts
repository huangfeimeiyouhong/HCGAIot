/**
 * 隔离预期值 —— 供 T13 验收脚本与 /demo/isolation 页面对照使用
 *
 * ⚠️ 这些数字不是硬编码常量，而是由当前 scope 规则实时算出来的，
 *    好处是改了隔离规则后对照表自动跟着变，不会出现「文档与行为不一致」。
 */
import { getDb } from './db';
import { resolveScope } from './scope';
import { scopedQuery } from './query';

import type { AuthStoreLike } from '@/store/types';
import type { VendorType } from '@/types';

/** 构造一个 AuthStoreLike（验收脚本与演示页共用） */
function authOf(role: 'PLATFORM' | 'VENDOR' | 'CUSTOMER', tenantId: string | null, vendorId: string | null, vendorType: VendorType | null): AuthStoreLike {
  return { role, tenantId, vendorId, vendorType };
}

/** 三个代表性账号的 scope 快照 */
export const PLATFORM_SCOPE = (): AuthStoreLike => authOf('PLATFORM', 'PLATFORM', null, null);
export const COOKWARE_SCOPE = (): AuthStoreLike => authOf('VENDOR', 'TEN-0001', 'TEN-0001', 'COOKWARE');
export const IOT_SCOPE = (): AuthStoreLike => authOf('VENDOR', 'TEN-0002', 'TEN-0002', 'IOT');
export const CUSTOMER_SCOPE = (tenantId = 'TEN-0005'): AuthStoreLike => authOf('CUSTOMER', tenantId, null, null);

/** 各角色可见设备数 */
export function deviceCountByScope(): { platform: number; cookware: number; iot: number; customer: number } {
  const db = getDb();
  return {
    platform: scopedQuery(db.devices, resolveScope(PLATFORM_SCOPE()), {}).total,
    cookware: scopedQuery(db.devices, resolveScope(COOKWARE_SCOPE()), {}).total,
    iot: scopedQuery(db.devices, resolveScope(IOT_SCOPE()), {}).total,
    customer: scopedQuery(db.devices, resolveScope(CUSTOMER_SCOPE()), {}).total,
  };
}

/** 各角色可见工单数 */
export function orderCountByScope(): { platform: number; cookware: number; iot: number; customer: number } {
  const db = getDb();
  return {
    platform: scopedQuery(db.workOrders, resolveScope(PLATFORM_SCOPE()), {}).total,
    cookware: scopedQuery(db.workOrders, resolveScope(COOKWARE_SCOPE()), {}).total,
    iot: scopedQuery(db.workOrders, resolveScope(IOT_SCOPE()), {}).total,
    customer: scopedQuery(db.workOrders, resolveScope(CUSTOMER_SCOPE()), {}).total,
  };
}

/** 各角色可见客户数 */
export function customerCountByScope(): { platform: number; cookware: number; iot: number } {
  const db = getDb();
  const count = (s: AuthStoreLike): number => scopedQuery(db.tenants, resolveScope(s), { filter: (t) => t.type === 'CUSTOMER' }).total;
  return {
    platform: count(PLATFORM_SCOPE()),
    cookware: count(COOKWARE_SCOPE()),
    iot: count(IOT_SCOPE()),
  };
}

/** 越权探测：找一个不属于该客户租户可见范围的设备 SN */
export function crossTenantProbeSn(tenantId = 'TEN-0005'): string | null {
  const db = getDb();
  const scope = resolveScope(CUSTOMER_SCOPE(tenantId));
  const outside = db.devices.find((d) => !scope.visibleDeviceSns?.has(d.sn));
  return outside?.sn ?? null;
}