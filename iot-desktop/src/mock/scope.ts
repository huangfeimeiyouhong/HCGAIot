/**
 * ★ 租户范围计算 —— 数据隔离的决策点
 *
 * ⚠️ 依赖方向：mock/scope.ts 只 import 常量/类型 + store/types.ts 的结构化类型
 *    （不 import store/auth.ts，彻底断开 mock → store 的反向依赖，约定 2 / 硬性规则 3）
 *
 * ⚠️ 改隔离规则需同步（约定 6 / S6）：
 *    ① 本文件三个分支 → ② mock/query.ts 的 applyScopeFilter/applyFieldScope
 *    → ③ utils/mask.ts 的通配规则 → ④ ScopeBadge 的 badgeText
 */
import { getDb } from './db';

import type { AuthStoreLike } from '@/store/types';
import type { Scope } from './types';

/**
 * 由登录态计算租户范围
 * @param auth 登录态结构化视图
 * @returns Scope（平台方全 null 不限；厂家按绑定 ∪ 本厂设备；客户按 OWNERSHIP 生效绑定）
 */
export function resolveScope(auth: AuthStoreLike): Scope {
  const db = getDb();

  // ── 平台方：全量 + 财务字段脱敏 ──
  if (auth.role === 'PLATFORM') {
    return {
      role: 'PLATFORM',
      tenantId: null,
      vendorId: null,
      vendorType: null,
      visibleDeviceSns: null,
      visibleCustomerIds: null,
      visibleVendorIds: null,
      maskFields: ['contractNo', 'settlementAccount'],
      stripFields: [],
      badgeText: '全局（财务字段脱敏）',
    };
  }

  // ── 客户：仅 OWNERSHIP 生效绑定到本租户的设备 ──
  if (auth.role === 'CUSTOMER') {
    const snSet = new Set(
      db.bindings
        .filter((b) => b.customerId === auth.tenantId && b.type === 'OWNERSHIP' && b.status === 'ACTIVE')
        .map((b) => b.deviceSn),
    );
    const vendorIds = new Set(
      db.bindings.filter((b) => snSet.has(b.deviceSn)).map((b) => b.vendorId),
    );
    return {
      role: 'CUSTOMER',
      tenantId: auth.tenantId,
      vendorId: null,
      vendorType: null,
      visibleDeviceSns: snSet,
      visibleCustomerIds: new Set(auth.tenantId ? [auth.tenantId] : []),
      visibleVendorIds: vendorIds,
      maskFields: [],
      stripFields: ['firmwareVersion', 'cost', 'components.*'],
      badgeText: '本租户全部数据',
    };
  }

  // ── 厂家：∃ACTIVE 绑定指向本厂 ∪ 本厂型号设备 ──
  const self = auth.vendorId ?? '';
  const activeBindings = db.bindings.filter((b) => b.vendorId === self && b.status === 'ACTIVE');
  const activeBoundSns = new Set(activeBindings.map((b) => b.deviceSn));
  const ownSns = new Set(
    db.devices.filter((d) => (d.vendorIds ?? []).includes(self) || (d.modelCode.startsWith('IOT') ? 'TEN-0002' : 'TEN-0001') === self).map((d) => d.sn),
  );
  const snSet = new Set([...activeBoundSns, ...ownSns]);
  const customerIds = new Set(activeBindings.map((b) => b.customerId));
  const isIot = auth.vendorType === 'IOT';

  return {
    role: 'VENDOR',
    tenantId: auth.tenantId,
    vendorId: self,
    vendorType: auth.vendorType ?? null,
    visibleDeviceSns: snSet,
    visibleCustomerIds: customerIds,
    visibleVendorIds: new Set([self]),
    maskFields: ['contractNo', 'settlementAccount'],
    // 物联网厂家不可见厨具本体的型号参数与成本；厨具厂家不可见部件固件与批次
    stripFields: isIot ? ['params', 'cost'] : ['components.firmwareVersion', 'components.batch'],
    badgeText: isIot ? '本厂家全部设备 · 部件可见' : '本厂家全部设备',
  };
}

/**
 * 判断某设备 SN 是否在当前范围内可见（页面按钮权限用）
 * @param scope 当前范围
 * @param sn 设备 SN
 * @returns 是否可见
 */
export function canSeeDevice(scope: Scope, sn: string): boolean {
  return !scope.visibleDeviceSns || scope.visibleDeviceSns.has(sn);
}

/**
 * 判断某客户租户是否在当前范围内可见
 * @param scope 当前范围
 * @param customerId 客户租户 id
 * @returns 是否可见
 */
export function canSeeCustomer(scope: Scope, customerId: string): boolean {
  return !scope.visibleCustomerIds || scope.visibleCustomerIds.has(customerId);
}

/**
 * 判断某厂家是否在当前范围内可见
 * @param scope 当前范围
 * @param vendorId 厂家 id
 * @returns 是否可见
 */
export function canSeeVendor(scope: Scope, vendorId: string): boolean {
  return !scope.visibleVendorIds || scope.visibleVendorIds.has(vendorId);
}

/**
 * 平台方空范围（未登录 / 公共页调用 api 时的兜底，给全量）
 * @returns 不限任何维度的 Scope
 */
export function openScope(): Scope {
  return {
    role: 'PLATFORM',
    tenantId: null,
    vendorId: null,
    vendorType: null,
    visibleDeviceSns: null,
    visibleCustomerIds: null,
    visibleVendorIds: null,
    maskFields: [],
    stripFields: [],
    badgeText: '未登录',
  };
}