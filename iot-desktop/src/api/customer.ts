/**
 * 客户端 API 层（当前为 mock 实现，延迟 200ms）
 *
 * 接入真实后端三步：
 *   1. 安装 axios，在 vite.config.ts 打开 /api 代理；
 *   2. 将下方各方法体替换为真实请求；
 *   3. 返回数据结构保持不变，上层页面零改动。
 *
 * 数据隔离：所有列表方法必须经 resolveScope(useAuthStore()) 注入范围，
 * 禁止在方法体内直接返回 getDb().xxx 全量数组。
 *
 * ⚠️ 客户视角特有约束：
 *   - 设备列表返回「聚合形态」，不含固件版本 / 成本 / 部件明细
 *   - 工单时间轴过滤掉厂家/平台内部动作（架构文档 A10.1 S6 假设）
 *   - 责任厂家由产权绑定派生，页面只读不可手选
 */
import { DEVICE_CATEGORY_LABEL } from '@/constants/dict';
import { REJECT_ESCALATE_THRESHOLD, slaOf } from '@/constants/sla';
import { addHours, remainDays } from '@/utils/date';

import { delay } from '@/mock/delay';
import { appendTimeline, applyTransition, getDb, nextId } from '@/mock/db';
import { scopedFind, scopedQuery } from '@/mock/query';
import { resolveScope } from '@/mock/scope';

import { useAuthStore } from '@/store/auth';

import type { AlarmQuery, DeviceQuery, WorkOrderQuery } from './types';
import type {
  Alarm,
  Attachment,
  Binding,
  ChartSeriesData,
  CustomerDeviceView,
  CustomerOrderView,
  CustomerThreshold,
  Device,
  DeviceMetricPoint,
  PageResult,
  PendingBindingView,
  Priority,
  ProblemType,
  ProgressRecord,
  SparePart,
  StatCardData,
  TimelineRecord,
  VendorScoreView,
  WorkOrder,
} from '@/types';

/** 当前操作人 */
function operatorName(): string {
  const auth = useAuthStore();
  return auth.userInfo?.displayName ?? '客户操作员';
}

/** 当前操作人角色 */
function operatorRole() {
  return useAuthStore().userInfo?.accountRole ?? 'CUSTOMER_ADMIN';
}

/** 客户视角不可见的内部动作角色（架构文档 A10.1 S6） */
const INTERNAL_ROLES = ['VENDOR_ADMIN', 'VENDOR_ENGINEER', 'PLATFORM_ADMIN', 'REVIEWER', 'OPS', 'DATA_OPS'];

/** 过滤时间轴：客户只看到面向自己的动作 */
function customerTimeline(records: TimelineRecord[]): TimelineRecord[] {
  return records.filter((r) => !r.operatorRole || !INTERNAL_ROLES.includes(r.operatorRole));
}

/* ============================================================
 * 工作台
 * ============================================================ */

/** 客户工作台 */
export function getDashboard(): Promise<{
  kpis: StatCardData[];
  categoryDist: ChartSeriesData[];
  todayAlarms: { total: number; unconfirmed: number; urgent: number };
  orderDist: ChartSeriesData[];
  vendorScore: { avgScore: number; ratedCount: number; vendors: number };
  pendingBindings: number;
}> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const db = getDb();

  const devices = scopedQuery(db.devices, scope, {}).list;
  const alarms = scopedQuery(db.alarms, scope, {}).list;
  const orders = scopedQuery(db.workOrders, scope, {}).list;
  // 绑定跳过设备维度：待确认绑定的设备尚未进入可见范围（见 getPendingBindings 说明）
  const bindings = scopedQuery(db.bindings, scope, { skipDeviceScope: true }).list;
  const today = new Date().toISOString().slice(0, 10);
  const todayAlarms = alarms.filter((a) => a.triggerTime.slice(0, 10) === today);

  const rated = orders.filter((o) => o.rating);
  const avgScore = rated.length
    ? Math.round((rated.reduce((s, o) => s + (o.rating?.score ?? 0), 0) / rated.length) * 10) / 10
    : 0;

  const kpis: StatCardData[] = [
    { key: 'devices', label: '我的设备', value: devices.length, unit: '台', tone: 'primary', to: '/customer/devices' },
    { key: 'online', label: '在线设备', value: devices.filter((d) => d.status === 'ONLINE').length, unit: '台', tone: 'success' },
    { key: 'alarms', label: '未确认告警', value: alarms.filter((a) => a.status === 'UNCONFIRMED').length, unit: '条', tone: 'danger', to: '/customer/alarms' },
    { key: 'orders', label: '处理中工单', value: orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'PENDING_CONFIRM').length, unit: '单', tone: 'warning', to: '/customer/work-orders' },
    { key: 'bindings', label: '待确认绑定', value: bindings.filter((b) => b.status === 'PENDING_CONFIRM').length, unit: '条', tone: 'info', to: '/customer/bindings' },
    { key: 'rating', label: '服务评价均分', value: avgScore || '—', unit: avgScore ? '分' : '', tone: 'purple', to: '/customer/vendors' },
  ];

  return delay({
    kpis,
    categoryDist: Object.entries(DEVICE_CATEGORY_LABEL).map(([code, name]) => ({
      name,
      value: devices.filter((d) => d.category === code).length,
    })),
    todayAlarms: {
      total: todayAlarms.length,
      unconfirmed: todayAlarms.filter((a) => a.status === 'UNCONFIRMED').length,
      urgent: todayAlarms.filter((a) => a.level === 'URGENT').length,
    },
    orderDist: [
      { name: '待接单', value: orders.filter((o) => o.status === 'PENDING_ACCEPT').length },
      { name: '处理中', value: orders.filter((o) => o.status === 'IN_PROGRESS').length },
      { name: '待验收', value: orders.filter((o) => o.status === 'PENDING_CONFIRM').length },
      { name: '已完成', value: orders.filter((o) => o.status === 'COMPLETED').length },
      { name: '已关闭', value: orders.filter((o) => o.status === 'CLOSED').length },
    ],
    vendorScore: {
      avgScore,
      ratedCount: rated.length,
      vendors: scope.visibleVendorIds?.size ?? 0,
    },
    pendingBindings: bindings.filter((b) => b.status === 'PENDING_CONFIRM').length,
  });
}

/* ============================================================
 * 设备（聚合形态）
 * ============================================================ */

/** 我的设备（无固件 / 成本 / 部件列） */
export function getDeviceList(q: DeviceQuery): Promise<PageResult<CustomerDeviceView>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const alarms = scopedQuery(db.alarms, scope, {}).list;
  const paged = scopedQuery(db.devices, scope, {
    keyword: q.keyword,
    searchFields: ['sn', 'name', 'modelCode', 'location'],
    sortBy: (q.sortBy ?? 'lastReportAt') as keyof Device,
    sortOrder: q.sortOrder ?? 'desc',
    page: q.page,
    pageSize: q.pageSize,
    filter: (d) =>
      (q.category ? d.category === q.category : true) && (q.status ? d.status === q.status : true),
  });

  return delay({
    list: paged.list.map((d) => toCustomerView(db, d, alarms)),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/** 设备 → 客户视角视图对象 */
function toCustomerView(db: ReturnType<typeof getDb>, d: Device, alarms: Alarm[]): CustomerDeviceView {
  const mine = alarms.filter((a) => a.deviceSn === d.sn);
  return {
    sn: d.sn,
    name: d.name,
    category: d.category,
    modelCode: d.modelCode,
    modelName: db.productModels.find((m) => m.modelCode === d.modelCode)?.name ?? d.modelCode,
    vendorId: d.vendorIds?.[0] ?? '',
    vendorName: db.tenants.find((t) => t.id === (d.vendorIds?.[0] ?? ''))?.shortName ?? '—',
    location: d.location,
    status: d.status,
    alarmStatus: mine.some((a) => a.status === 'UNCONFIRMED') ? 'HAS_ALARM' : 'NORMAL',
    alarmCount: d.alarmCount,
    lastReportAt: d.lastReportAt,
    warrantyUntil: d.warrantyUntil,
  };
}

/** 设备详情（部件只给数量，不含固件/成本） */
export function getDeviceDetail(sn: string): Promise<{
  device: CustomerDeviceView;
  metrics: DeviceMetricPoint[];
  alarms: Alarm[];
  workOrders: WorkOrder[];
  componentCount: number;
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const device = scopedFind(db.devices, 'sn', sn, scope);
  if (!device) return Promise.reject(new Error('设备不存在或不在您的资产范围内'));
  const alarms = scopedQuery(db.alarms, scope, { filter: (a) => a.deviceSn === sn, sortBy: 'triggerTime', sortOrder: 'desc' }).list;
  return delay({
    device: toCustomerView(db, device, alarms),
    metrics: db.deviceMetrics.filter((m) => m.deviceSn === sn).slice(-120),
    alarms,
    workOrders: scopedQuery(db.workOrders, scope, { filter: (o) => o.deviceSn === sn }).list,
    componentCount: db.components.filter((c) => c.deviceSn === sn).length,
  });
}

/** 导出设备指标（演示环境只 Toast，不生成真实文件） */
/** 导出设备指标（演示环境只 Toast，不生成真实文件，见假设 A-6） */
export function exportDeviceMetrics(_sn: string, _range: [string, string]): Promise<void> {
  return delay(undefined);
}

/** 某设备的责任厂家（由产权绑定派生，页面只读） */
export function getResponsibleVendor(deviceSn: string): Promise<{ vendorId: string; vendorName: string }> {
  const db = getDb();
  const binding = db.bindings.find(
    (b) => b.deviceSn === deviceSn && b.type === 'OWNERSHIP' && b.status === 'ACTIVE',
  );
  const vendorId = binding?.vendorId ?? db.devices.find((d) => d.sn === deviceSn)?.vendorIds?.[0] ?? '';
  return delay({
    vendorId,
    vendorName: db.tenants.find((t) => t.id === vendorId)?.shortName ?? '—',
  });
}

/* ============================================================
 * 告警
 * ============================================================ */

/** 告警列表 */
export function getAlarmList(q: AlarmQuery): Promise<PageResult<Alarm>> {
  const db = getDb();
  return delay(
    scopedQuery(db.alarms, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['id', 'deviceSn', 'type'],
      sortBy: 'triggerTime',
      sortOrder: 'desc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (a) =>
        (q.level ? a.level === q.level : true) &&
        (q.status ? a.status === q.status : true) &&
        (q.deviceSn ? a.deviceSn === q.deviceSn : true),
    }),
  );
}

/** 告警详情 */
export function getAlarmDetail(id: string): Promise<{
  alarm: Alarm;
  metrics: DeviceMetricPoint[];
  vendor: string;
  order?: WorkOrder;
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const alarm = scopedFind(db.alarms, 'id', id, scope);
  if (!alarm) return Promise.reject(new Error('告警不存在或不在您的资产范围内'));
  return delay({
    alarm,
    metrics: db.deviceMetrics.filter((m) => m.deviceSn === alarm.deviceSn).slice(-60),
    vendor: db.tenants.find((t) => t.id === alarm.vendorId)?.shortName ?? '—',
    order: alarm.orderId ? db.workOrders.find((o) => o.code === alarm.orderId) : undefined,
  });
}

/** 确认告警 */
export function confirmAlarm(id: string): Promise<Alarm> {
  const db = getDb();
  try {
    applyTransition({
      collection: 'alarms',
      id,
      to: 'CONFIRMED',
      action: 'confirmAlarm',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: '客户已确认告警',
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(db.alarms.find((a) => a.id === id)!);
}

/* ============================================================
 * 工单
 * ============================================================ */

/** 报修工单列表 */
export function getWorkOrderList(q: WorkOrderQuery): Promise<PageResult<CustomerOrderView>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const paged = scopedQuery(db.workOrders, scope, {
    keyword: q.keyword,
    searchFields: ['code', 'deviceSn', 'description'],
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: q.page,
    pageSize: q.pageSize,
    filter: (o) => (q.status ? o.status === q.status : true) && (q.priority ? o.priority === q.priority : true),
  });
  return delay({
    list: paged.list.map((o) => toOrderView(db, o)),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/** 工单 → 客户视角视图对象 */
function toOrderView(db: ReturnType<typeof getDb>, o: WorkOrder): CustomerOrderView {
  return {
    code: o.code,
    status: o.status,
    priority: o.priority,
    deviceSn: o.deviceSn,
    deviceName: db.devices.find((d) => d.sn === o.deviceSn)?.name ?? o.deviceSn,
    vendorName: db.tenants.find((t) => t.id === o.vendorId)?.shortName ?? '—',
    createdAt: o.createdAt,
    deadlineAt: o.deadlineAt,
    escalationLevel: o.escalationLevel,
  };
}

/**
 * 发起报修（责任厂家由产权绑定派生，不可手选）
 * @param payload 设备 SN、告警、问题类型、描述、优先级、附件
 * @returns 新建工单
 */
export function createWorkOrder(payload: {
  deviceSn: string;
  alarmId?: string;
  problemType: ProblemType;
  description: string;
  priority: Priority;
  attachments: Attachment[];
}): Promise<WorkOrder> {
  if (!payload.deviceSn) return Promise.reject(new Error('请选择报修设备'));
  if (!payload.description) return Promise.reject(new Error('请填写故障描述'));

  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const device = scopedFind(db.devices, 'sn', payload.deviceSn, scope);
  if (!device) return Promise.reject(new Error('设备不存在或不在您的资产范围内'));

  // 责任厂家：优先取生效的产权绑定厂家，其次取设备装配厂家（派生，页面只读）
  const binding = db.bindings.find(
    (b) => b.deviceSn === payload.deviceSn && b.type === 'OWNERSHIP' && b.status === 'ACTIVE',
  );
  const vendorId = binding?.vendorId ?? device.vendorIds?.[0] ?? '';
  if (!vendorId) return Promise.reject(new Error('该设备尚未绑定责任厂家，请先确认绑定关系'));

  const sla = slaOf(payload.priority);
  const now = new Date().toISOString();
  const order: WorkOrder = {
    code: `WO-2026-${String(db.workOrders.length + 1).padStart(4, '0')}`,
    source: 'CUSTOMER_REPAIR',
    deviceSn: payload.deviceSn,
    alarmId: payload.alarmId,
    vendorId,
    customerId: scope.tenantId ?? '',
    problemType: payload.problemType,
    description: payload.description,
    priority: payload.priority,
    sla,
    status: 'PENDING_ACCEPT',
    deadlineAt: addHours(now, sla.handleHours),
    rejectCount: 0,
    disputeFlag: false,
    createdAt: now,
    escalationLevel: 0,
    attachments: payload.attachments,
  };
  db.workOrders.unshift(order);
  appendTimeline('workOrders', order.code, 'create', operatorName(), payload.description, operatorRole());
  return delay(order);
}

/** 撤单（仅 PENDING_ACCEPT，必填原因） */
export function cancelWorkOrder(code: string, reason: string): Promise<void> {
  if (!reason) return Promise.reject(new Error('撤单原因不能为空'));
  try {
    applyTransition({
      collection: 'workOrders',
      id: code,
      to: 'CLOSED',
      action: 'cancel',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: reason,
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(undefined);
}

/** 工单详情（含备件、时间轴、验收信息） */
export function getWorkOrderDetail(code: string): Promise<{
  order: WorkOrder;
  timeline: TimelineRecord[];
  /** 处理进展（厂家 addProgress 写入，客户可见，用于「处理进展」表格） */
  progress: ProgressRecord[];
  spareParts: SparePart[];
  deviceName: string;
  vendorName: string;
  needPlatform: boolean;
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const order = scopedFind(db.workOrders, 'code', code, scope);
  if (!order) return Promise.reject(new Error('工单不存在或不在您的资产范围内'));
  return delay({
    order,
    timeline: customerTimeline(db.workOrderTimelines.filter((t) => t.bizId === code)),
    progress: db.workOrderProgress.filter((p) => p.orderCode === code),
    spareParts: db.spareParts.filter((s) => s.orderCode === code),
    deviceName: db.devices.find((d) => d.sn === order.deviceSn)?.name ?? order.deviceSn,
    vendorName: db.tenants.find((t) => t.id === order.vendorId)?.shortName ?? '—',
    needPlatform: order.rejectCount > REJECT_ESCALATE_THRESHOLD,
  });
}

/**
 * 验收（通过 / 驳回，驳回必填原因）
 * @param code 工单编号
 * @param payload pass 是否通过；驳回时 rejectReason 必填
 * @returns 流转后的工单
 */
export function acceptWorkOrder(code: string, payload: { pass: boolean; rejectReason?: string }): Promise<WorkOrder> {
  const db = getDb();
  if (!payload.pass && !payload.rejectReason) {
    return Promise.reject(new Error('验收驳回必须填写原因'));
  }
  try {
    if (payload.pass) {
      applyTransition({
        collection: 'workOrders',
        id: code,
        to: 'COMPLETED',
        action: 'accept',
        operator: operatorName(),
        operatorRole: operatorRole(),
        remark: '客户验收通过',
        patch: { completedAt: new Date().toISOString() },
      });
    } else {
      const order = db.workOrders.find((o) => o.code === code);
      const next = (order?.rejectCount ?? 0) + 1;
      applyTransition({
        collection: 'workOrders',
        id: code,
        to: 'IN_PROGRESS',
        action: 'reject',
        operator: operatorName(),
        operatorRole: operatorRole(),
        remark: payload.rejectReason,
        patch: { rejectCount: next },
      });
    }
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(db.workOrders.find((o) => o.code === code)!);
}

/** 评价（仅 COMPLETED 后） */
export function rateWorkOrder(code: string, payload: { score: number; comment: string }): Promise<void> {
  const db = getDb();
  const order = db.workOrders.find((o) => o.code === code);
  if (!order) return Promise.reject(new Error('工单不存在'));
  if (order.status !== 'COMPLETED') return Promise.reject(new Error('工单完成后才能评价'));
  order.rating = { score: payload.score, comment: payload.comment, ratedAt: new Date().toISOString() };
  appendTimeline('workOrders', code, 'rate', operatorName(), `评分 ${payload.score} 分：${payload.comment}`, operatorRole());
  return delay(undefined);
}

/* ============================================================
 * 绑定确认
 * ============================================================ */

/** 待确认绑定（含 7 天倒计时） */
export function getPendingBindings(): Promise<PendingBindingView[]> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  // ⚠️ 必须跳过设备维度隔离：绑定正是让设备进入客户可见范围的机制，
  //   待确认绑定的 deviceSn 按定义还不在 visibleDeviceSns 内。
  //   若走设备维度，这里会恒为空，「绑定确认」页永远列不出东西（断链二直接断）。
  //   客户维度仍生效：只可能看到申报给本租户的绑定。
  const rows = scopedQuery(db.bindings, scope, {
    skipDeviceScope: true,
    filter: (b) => b.status === 'PENDING_CONFIRM',
    sortBy: 'declaredAt',
    sortOrder: 'desc',
  }).list;
  return delay(
    rows.map((b) => {
      const device = db.devices.find((d) => d.sn === b.deviceSn);
      const deadline = b.autoConfirmDeadline ?? addHours(b.declaredAt ?? b.effectiveFrom, 24 * 7);
      return {
        id: b.id,
        deviceSn: b.deviceSn,
        deviceName: device?.name ?? b.deviceSn,
        deviceModel: device?.modelCode ?? '—',
        vendorId: b.vendorId,
        vendorName: db.tenants.find((t) => t.id === b.vendorId)?.shortName ?? b.vendorId,
        type: b.type,
        declaredBy: b.operator,
        declaredAt: b.declaredAt ?? b.effectiveFrom,
        autoConfirmDeadline: deadline,
        remainDays: remainDays(deadline),
      };
    }),
  );
}

/**
 * 确认 / 拒绝绑定（拒绝必填原因）
 * @param bindingId 绑定 id
 * @param ok true=确认，false=拒绝
 * @param reason 拒绝原因
 * @returns 流转后的绑定
 */
export function confirmBinding(bindingId: string, ok: boolean, reason?: string): Promise<Binding> {
  const db = getDb();
  if (!ok && !reason) return Promise.reject(new Error('拒绝原因不能为空'));
  try {
    applyTransition({
      collection: 'bindings',
      id: bindingId,
      to: ok ? 'ACTIVE' : 'RELEASED',
      action: ok ? 'confirmBinding' : 'rejectBinding',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: ok ? '客户确认绑定生效' : reason,
      patch: ok ? { effectiveFrom: new Date().toISOString() } : { rejectReason: reason },
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(db.bindings.find((b) => b.id === bindingId)!);
}

/** 绑定历史记录 */
export function getBindingHistory(): Promise<Array<Binding & { deviceName: string; vendorName: string }>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  // 同样跳过设备维度：客户要能看到「申报给本租户」的全部绑定历史，
  // 含尚未确认 / 已解除的（这些绑定的设备可能已不在可见范围内）
  const rows = scopedQuery(db.bindings, scope, {
    skipDeviceScope: true,
    sortBy: 'effectiveFrom',
    sortOrder: 'desc',
  }).list;
  return delay(
    rows.map((b) => ({
      ...b,
      deviceName: db.devices.find((d) => d.sn === b.deviceSn)?.name ?? b.deviceSn,
      vendorName: db.tenants.find((t) => t.id === b.vendorId)?.shortName ?? b.vendorId,
    })),
  );
}

/* ============================================================
 * 厂家评价 / 阈值 / 账号
 * ============================================================ */

/** 厂家服务评价列表 */
export function getVendorScores(): Promise<VendorScoreView[]> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const vendorIds = Array.from(scope.visibleVendorIds ?? []);
  const stats = db.vendorSlaStats.filter((s) => s.quarter === '2026Q3');
  return delay(
    vendorIds.map((vid) => {
      const myOrders = db.workOrders.filter((o) => o.vendorId === vid && o.customerId === scope.tenantId);
      const rated = myOrders.filter((o) => o.rating);
      const stat = stats.find((s) => s.vendorId === vid);
      return {
        vendorId: vid,
        vendorName: db.tenants.find((t) => t.id === vid)?.shortName ?? vid,
        avgResponse: stat?.avgResponseHours ?? 0,
        onTimeRate: stat?.onTimeHandleRate ?? 0,
        myOrderCount: myOrders.length,
        myRating: rated.length
          ? Math.round((rated.reduce((s, o) => s + (o.rating?.score ?? 0), 0) / rated.length) * 10) / 10
          : undefined,
      };
    }),
  );
}

/** 提交厂家评价 */
export function submitVendorReview(vendorId: string, payload: { score: number; comment: string }): Promise<void> {
  const db = getDb();
  const target = db.workOrders.find((o) => o.vendorId === vendorId && o.customerId === useAuthStore().tenantId);
  if (!target) return Promise.reject(new Error('暂无可评价的工单'));
  target.rating = { score: payload.score, comment: payload.comment, ratedAt: new Date().toISOString() };
  db.notifications.unshift({
    id: nextId('NTF'),
    tenantId: vendorId,
    type: 'ORDER_PROGRESS',
    title: `客户对工单 ${target.code} 提交了评价`,
    content: `评分 ${payload.score} 分：${payload.comment}`,
    isRead: false,
    refType: 'ORDER',
    refId: target.code,
    createdAt: new Date().toISOString(),
  });
  return delay(undefined);
}

/** 阈值列表 */
export function getThresholds(): Promise<CustomerThreshold[]> {
  const db = getDb();
  return delay(scopedQuery(db.customerThresholds, resolveScope(useAuthStore()), {}).list);
}

/** 保存阈值 */
export function saveThreshold(payload: Partial<CustomerThreshold>): Promise<CustomerThreshold> {
  const db = getDb();
  const auth = useAuthStore();
  const hit = payload.id ? db.customerThresholds.find((t) => t.id === payload.id) : undefined;
  if (hit) {
    Object.assign(hit, payload);
    return delay(hit);
  }
  const created: CustomerThreshold = {
    id: payload.id ?? nextId('THR'),
    tenantId: auth.tenantId ?? '',
    deviceSn: payload.deviceSn ?? '',
    metricKey: payload.metricKey ?? 'temperature',
    threshold: payload.threshold ?? 0,
    level: payload.level ?? 'IMPORTANT',
    enabled: payload.enabled ?? true,
  };
  db.customerThresholds.unshift(created);
  return delay(created);
}

/** 启停阈值 */
export function toggleThreshold(id: string, enabled: boolean): Promise<void> {
  const db = getDb();
  const hit = db.customerThresholds.find((t) => t.id === id);
  if (!hit) return Promise.reject(new Error('阈值不存在'));
  hit.enabled = enabled;
  return delay(undefined);
}

/** 子账号列表 */
export function getAccountList(): Promise<import('@/types').TenantAccount[]> {
  const db = getDb();
  const auth = useAuthStore();
  return delay(db.tenantAccounts.filter((a) => a.tenantId === auth.tenantId));
}

/** 邀请子账号 */
export function inviteAccount(payload: Partial<import('@/types').TenantAccount>): Promise<import('@/types').TenantAccount> {
  const db = getDb();
  const auth = useAuthStore();
  const account: import('@/types').TenantAccount = {
    id: nextId('ACC'),
    tenantId: auth.tenantId ?? '',
    name: payload.name ?? '新账号',
    account: payload.account ?? `user${db.tenantAccounts.length + 1}`,
    role: payload.role ?? 'CUSTOMER_VIEWER',
    status: 'PENDING_APPROVE',
    phone: payload.phone,
    createdAt: new Date().toISOString(),
  };
  db.tenantAccounts.unshift(account);
  return delay(account);
}

/** 审批子账号 */
export function approveAccount(id: string, ok: boolean): Promise<void> {
  const db = getDb();
  const hit = db.tenantAccounts.find((a) => a.id === id);
  if (!hit) return Promise.reject(new Error('账号不存在'));
  hit.status = ok ? 'ACTIVE' : 'DISABLED';
  return delay(undefined);
}

/** 通知中心（客户） */
export function getNotificationList(q: { page: number; pageSize: number; keyword?: string; isRead?: boolean }): Promise<PageResult<import('@/types').Notification>> {
  const db = getDb();
  return delay(
    scopedQuery(db.notifications, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['title', 'content'],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (n) => (q.isRead === undefined ? true : n.isRead === q.isRead),
    }),
  );
}

/** 客户端 API 对象 */
export const customerApi = {
  getDashboard,
  getDeviceList,
  getDeviceDetail,
  exportDeviceMetrics,
  getResponsibleVendor,
  getAlarmList,
  getAlarmDetail,
  confirmAlarm,
  getWorkOrderList,
  createWorkOrder,
  cancelWorkOrder,
  getWorkOrderDetail,
  acceptWorkOrder,
  rateWorkOrder,
  getPendingBindings,
  confirmBinding,
  getBindingHistory,
  getVendorScores,
  submitVendorReview,
  getThresholds,
  saveThreshold,
  toggleThreshold,
  getAccountList,
  inviteAccount,
  approveAccount,
  getNotificationList,
};