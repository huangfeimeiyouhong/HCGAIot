/**
 * 数据隔离演示 API —— 三角色可见范围对照矩阵
 *
 * 把 /demo/isolation 页面原本直接 import 的 mock 计算逻辑收口到 api 层，
 * 页面不再直连 mock/fixtures、mock/scope，只消费本模块。
 * 数字由 scope 规则实时算出（非硬编码），改规则对照表自动跟随。
 */
import { resolveScope } from '@/mock/scope';
import {
  COOKWARE_SCOPE,
  CUSTOMER_SCOPE,
  IOT_SCOPE,
  PLATFORM_SCOPE,
  crossTenantProbeSn,
  customerCountByScope,
  deviceCountByScope,
  orderCountByScope,
} from '@/mock/fixtures';

import type { AuthStoreLike } from '@/store/types';

/** 越权防护演示用的探针租户 */
export const ISOLATION_PROBE_TENANT = 'TEN-0005';

/** 隔离矩阵单行 */
export interface IsolationMatrixRow {
  roleLabel: string;
  account: string;
  /** 顶栏数据范围徽标文案（与顶栏一致） */
  badge: string;
  tone: 'warning' | 'processing' | 'info';
  devices: number;
  orders: number;
  customers: number;
  /** 字段处理说明 */
  notes: string;
}

/** 取某 scope 工厂对应的范围徽标文案 */
function badgeOf(scopeFactory: () => AuthStoreLike): string {
  return resolveScope(scopeFactory()).badgeText;
}

/**
 * 构造三角色可见范围对照矩阵（实时计算）
 * @returns 四行对照数据
 */
export function getIsolationMatrix(): IsolationMatrixRow[] {
  const devices = deviceCountByScope();
  const orders = orderCountByScope();
  const customers = customerCountByScope();
  return [
    {
      roleLabel: '平台方',
      account: 'plat_admin',
      badge: badgeOf(PLATFORM_SCOPE),
      tone: 'warning',
      devices: devices.platform,
      orders: orders.platform,
      customers: customers.platform,
      notes: '全量可见；租户的 contractNo / settlementAccount 脱敏为 ***',
    },
    {
      roleLabel: '厨具厂家',
      account: 'vendor_ck_admin',
      badge: badgeOf(COOKWARE_SCOPE),
      tone: 'processing',
      devices: devices.cookware,
      orders: orders.cookware,
      customers: customers.cookware,
      notes: '仅本厂家设备与服务范围内客户；部件的固件版本与批次被裁剪',
    },
    {
      roleLabel: '物联网厂家',
      account: 'vendor_iot_admin',
      badge: badgeOf(IOT_SCOPE),
      tone: 'processing',
      devices: devices.iot,
      orders: orders.iot,
      customers: customers.iot,
      notes: '同厨具厂家的设备范围；部件台账可见，但型号参数与成本被裁剪',
    },
    {
      roleLabel: '客户',
      account: 'cust_school_admin',
      badge: badgeOf(CUSTOMER_SCOPE),
      tone: 'info',
      devices: devices.customer,
      orders: orders.customer,
      customers: customers.cookware,
      notes: '仅 OWNERSHIP 生效绑定到本租户的设备；无固件版本 / 成本 / 部件明细',
    },
  ];
}

/**
 * 取越权探测 SN（不属于该客户租户可见范围的设备）
 * @param tenantId 探针租户
 * @returns 越权 SN；无则 null
 */
export function getIsolationProbeSn(tenantId: string = ISOLATION_PROBE_TENANT): string | null {
  return crossTenantProbeSn(tenantId);
}
