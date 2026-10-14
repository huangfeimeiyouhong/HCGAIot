/**
 * 各工厂函数汇总导出 + 初始化编排 initDb()
 *
 * ⚠️ 只有本文件与 stories.ts 可以构造 MockDb；页面禁止 import 这里的任何数据数组
 */
import { SLA_DEFAULT } from '@/constants/sla';

import { genAlarmRules, genAlarms, genCustomerThresholds } from './alarms';
import { genProductModels } from './catalog';
import { deriveOwnerCustomer, genBindingHistory, genBindings } from './bindings';
import { genComponents, genDevices } from './devices';
import { genAuditLogs, genDisputes } from './audit';
import { genDeviceMetrics } from './metrics';
import { genNotifications } from './notifications';
import { genOnboardingApplications, genOnboardingTimelines } from './onboarding';
import { genUsageStats, genVendorSlaStats } from './performance';
import { createRandom, DEMO_SEED } from './random';
import { applyStoryLines } from './stories';
import { genSpareParts, genWorkOrderProgress, genWorkOrders, genWorkOrderTimelines } from './work-orders';
import { genTenantAccounts, genTenants } from './tenants';

import type { MockDb } from '../db';
import type { Priority, SlaConfigRow } from '@/types';

export * from './random';
export { calcWarrantyUntil } from './devices';
export { applyStoryLines, STORY } from './stories';

/** SLA 配置初始值（4 优先级） */
function buildSlaConfig(): SlaConfigRow[] {
  return (Object.keys(SLA_DEFAULT) as Priority[]).map((priority) => ({
    priority,
    ...SLA_DEFAULT[priority],
  }));
}

/**
 * 初始化全库（模块级单例，固定种子保证刷新后数据稳定）
 * @returns 完整的内存数据库
 */
export function initDb(): MockDb {
  // ⚠️ 固定种子：演示时数字乱跳会破坏可信度（架构文档 A10.3 假设 A-1）
  const r = createRandom(DEMO_SEED);

  // ── 租户与账号 ──
  const tenants = genTenants(r);
  const tenantAccounts = genTenantAccounts(r, tenants);

  // ── 型号 → 设备 → 部件 ──
  const productModels = genProductModels(r);
  const modelCodes = productModels.map((m) => m.modelCode);
  const devices = genDevices(r, modelCodes);
  const iotDeviceSns = devices.filter((d) => d.modelCode.startsWith('IOT')).map((d) => d.sn);
  const components = genComponents(r, iotDeviceSns);

  // ── 绑定 → 派生设备归属 ──
  const bindings = genBindings(r, devices, tenants);
  const bindingHistory = genBindingHistory(r, bindings);
  deriveOwnerCustomer(devices, bindings);

  // ── 入驻申请 ──
  const modelsByVendor = productModels.reduce<Record<string, typeof productModels>>((acc, m) => {
    (acc[m.vendorId] ??= []).push(m);
    return acc;
  }, {});
  const onboardingApplications = genOnboardingApplications(r, modelsByVendor);

  // ── 告警 → 工单 ──
  const vendorOf = (d: (typeof devices)[number]): string =>
    d.vendorIds[0] ?? (d.modelCode.startsWith('IOT') ? 'TEN-0002' : 'TEN-0001');
  const alarms = genAlarms(r, devices, vendorOf);
  const workOrders = genWorkOrders(r, devices, alarms, vendorOf);
  const workOrderTimelines = genWorkOrderTimelines(r, workOrders);
  const workOrderProgress = genWorkOrderProgress(r, workOrders);
  const spareParts = genSpareParts(r, workOrders);

  const db: MockDb = {
    tenants,
    tenantAccounts,
    onboardingApplications,
    onboardingTimelines: genOnboardingTimelines(r, onboardingApplications),
    productModels,
    devices,
    components,
    bindings,
    bindingHistory,
    alarms,
    alarmTimelines: [],
    workOrders,
    workOrderTimelines,
    workOrderProgress,
    spareParts,
    deviceMetrics: genDeviceMetrics(r, devices),
    notifications: genNotifications(r, tenants),
    auditLogs: genAuditLogs(r, tenants),
    alarmRules: genAlarmRules(r),
    slaConfig: buildSlaConfig(),
    disputes: genDisputes(r, workOrders, devices, tenants),
    vendorSlaStats: genVendorSlaStats(r),
    usageStats: genUsageStats(r, devices, workOrders),
    customerThresholds: genCustomerThresholds(r, devices, tenants),
    bindingTimelines: [],
    _seq: 0,
  };

  // ★ 预设故事线定点覆盖（必须最后执行，保证不被随机数据冲掉）
  applyStoryLines(db, r);

  return db;
}