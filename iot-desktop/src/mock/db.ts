/**
 * ★ 内存数据库 —— 唯一持有原始数组的地方
 *
 * 硬约束（架构文档 A6.1）：
 *   只有 mock/query.ts 与 mock/factories/stories.ts 可以 import 本文件的原始集合；
 *   api 层必须经 scopedQuery / scopedFind / scopedMutate 访问；
 *   页面绝对禁止直接 import（否则数据隔离失效）。
 *
 * 状态流转唯一入口 applyTransition()：校验迁移边 → 改状态 + patch →
 * 追加 append-only 时间轴 → 重算工单 escalationLevel → 回填告警 orderId。
 */
import { calcSlaRatio, escalationOf } from '@/constants/sla';
import { canTransition, TIMELINE_ONLY_ACTIONS, type MachineKey } from '@/constants/stateMachine';

import { initDb } from './factories';

import type { AccountRole } from '@/types';
import type { TransitionOptions } from './types';
import type {
  Alarm,
  AlarmRule,
  AuditLog,
  Binding,
  BindingHistory,
  Component,
  CustomerThreshold,
  Device,
  DeviceMetricPoint,
  Dispute,
  Notification,
  OnboardingApplication,
  ProductModel,
  ProgressRecord,
  SlaConfigRow,
  SparePart,
  Tenant,
  TenantAccount,
  TimelineRecord,
  UsageStat,
  VendorSlaStat,
  WorkOrder,
} from '@/types';

/** 内存库结构（照抄架构文档 A6.4 的 22 个集合 + 2 条流转时间轴 + 自增序列） */
export interface MockDb {
  tenants: Tenant[];
  tenantAccounts: TenantAccount[];
  onboardingApplications: OnboardingApplication[];
  onboardingTimelines: TimelineRecord[];
  productModels: ProductModel[];
  devices: Device[];
  components: Component[];
  bindings: Binding[];
  bindingHistory: BindingHistory[];
  alarms: Alarm[];
  alarmTimelines: TimelineRecord[];
  workOrders: WorkOrder[];
  workOrderTimelines: TimelineRecord[];
  workOrderProgress: ProgressRecord[];
  spareParts: SparePart[];
  deviceMetrics: DeviceMetricPoint[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  alarmRules: AlarmRule[];
  slaConfig: SlaConfigRow[];
  disputes: Dispute[];
  vendorSlaStats: VendorSlaStat[];
  usageStats: UsageStat[];
  customerThresholds: CustomerThreshold[];
  bindingTimelines: TimelineRecord[];
  /** 自增序列（mock 环境不引入 uuid 依赖） */
  _seq: number;
}

let db: MockDb | null = null;

/**
 * 取内存库单例（模块级 lazy init，刷新浏览器即回初始态）
 * @returns 内存库
 */
export function getDb(): MockDb {
  if (!db) db = initDb();
  return db;
}

/** 仅测试用：重置内存库 */
export function resetDb(): void {
  db = null;
}

/** 集合 → 状态机键 */
const COLLECTION_MACHINE: Record<TransitionOptions['collection'], MachineKey> = {
  onboardingApplications: 'ONBOARDING',
  workOrders: 'WORK_ORDER',
  alarms: 'ALARM',
  bindings: 'BINDING',
};

/** 集合 → 时间轴数组取值 */
const TIMELINE_COLLECTION: Record<TransitionOptions['collection'], (d: MockDb) => TimelineRecord[]> = {
  onboardingApplications: (d) => d.onboardingTimelines,
  workOrders: (d) => d.workOrderTimelines,
  alarms: (d) => d.alarmTimelines,
  bindings: (d) => d.bindingTimelines,
};

/** 集合 → id 字段（工单用 code，其余用 id） */
const ID_KEY: Record<TransitionOptions['collection'], 'id' | 'code'> = {
  onboardingApplications: 'id',
  workOrders: 'code',
  alarms: 'id',
  bindings: 'id',
};

/** 可被状态机流转的集合（applyTransition 只允许改这四个） */
export type TransitionCollection = TransitionOptions['collection'];

/**
 * 生成 mock 内唯一 id
 * @param prefix id 前缀
 * @returns 唯一 id
 */
export function nextId(prefix: string): string {
  const d = getDb();
  d._seq += 1;
  return `${prefix}-X${d._seq}`;
}

/**
 * ★ 状态流转唯一入口
 *
 * 1. 找到目标记录（不存在抛错）
 * 2. 校验 from → to 是否在状态机定义的合法迁移边内（TIMELINE_ONLY_ACTIONS 放行）
 * 3. 改状态 + 合并 patch
 * 4. 追加一条 TimelineRecord（append-only，页面只读）
 * 5. 工单：按 SLA 已消耗比例重算 escalationLevel
 * 6. 工单开始处理且关联告警：回填 alarm.orderId 并置 alarm.status='PROCESSING'
 *
 * ⚠️ 只改内存数据与时间轴，**不做任何跨入口通知**（PRD ⑥ 不做跨端联动）
 *
 * @param opts 流转参数
 */
export function applyTransition(opts: TransitionOptions): void {
  const d = getDb();
  const coll = d[opts.collection] as unknown as Array<Record<string, unknown>>;
  const idKey = ID_KEY[opts.collection];
  const row = coll.find((r) => r[idKey] === opts.id);
  if (!row) throw new Error(`[mock] 单据不存在：${opts.id}`);

  const machineKey = COLLECTION_MACHINE[opts.collection];
  const from = String(row.status);
  const timelineOnly = TIMELINE_ONLY_ACTIONS[machineKey]?.includes(opts.action) ?? false;

  if (!timelineOnly && !canTransition(machineKey, from, opts.to)) {
    throw new Error(`[mock] 非法状态迁移：${from} → ${opts.to}（动作 ${opts.action}）`);
  }

  const time = opts.time ?? new Date().toISOString();
  const to = timelineOnly ? from : opts.to;

  row.status = to;
  if (opts.patch) Object.assign(row, opts.patch);

  // append-only 时间轴
  TIMELINE_COLLECTION[opts.collection](d).push({
    id: nextId('TL'),
    bizId: opts.id,
    action: opts.action,
    operator: opts.operator,
    operatorRole: opts.operatorRole as AccountRole | undefined,
    time,
    remark: opts.remark,
    fromStatus: from,
    toStatus: to,
  });

  // 工单：重算三级升级
  if (opts.collection === 'workOrders') {
    const order = row as unknown as WorkOrder;
    order.escalationLevel = escalationOf(calcSlaRatio(order.createdAt, order.deadlineAt));
  }

  // 告警被工单关联且工单已开始处理 → 回填
  if (opts.collection === 'workOrders' && to !== 'PENDING_ACCEPT' && opts.patch?.alarmId) {
    const alarmId = opts.patch.alarmId as string;
    const alarm = d.alarms.find((a) => a.id === alarmId);
    if (alarm) {
      alarm.status = 'PROCESSING';
      alarm.orderId = opts.id;
    }
  }
}

/**
 * 追加一条时间轴（不改变主状态，如「更新进展」）
 * @param collection 所属集合
 * @param bizId 单据 id
 * @param action 动作键
 * @param operator 操作人
 * @param remark 备注
 * @param operatorRole 操作人角色
 */
export function appendTimeline(
  collection: TransitionCollection,
  bizId: string,
  action: string,
  operator: string,
  remark?: string,
  operatorRole?: AccountRole,
): void {
  const d = getDb();
  TIMELINE_COLLECTION[collection](d).push({
    id: nextId('TL'),
    bizId,
    action,
    operator,
    operatorRole,
    time: new Date().toISOString(),
    remark,
  });
}