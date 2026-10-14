/**
 * 平台方 API 层（当前为 mock 实现，延迟 200ms）
 *
 * 接入真实后端三步：
 *   1. 安装 axios，在 vite.config.ts 打开 /api 代理；
 *   2. 将下方各方法体替换为真实请求；
 *   3. 返回数据结构保持不变，上层页面零改动。
 *
 * 数据隔离：所有列表方法必须经 resolveScope(useAuthStore()) 注入范围，
 * 禁止在方法体内直接返回 getDb().xxx 全量数组。
 */
import { ALARM_METRIC_MAP, ALARM_TYPE_OPTIONS, DEVICE_CATEGORY_LABEL, PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { QUARTERS } from '@/mock/factories/performance';
import { TRIAL_DAYS } from '@/constants/sla';

import { delay } from '@/mock/delay';
import { appendTimeline, applyTransition, getDb, nextId } from '@/mock/db';
import { scopedFind, scopedQuery } from '@/mock/query';
import { resolveScope } from '@/mock/scope';
import { lastDays } from '@/utils/date';

import { useAuthStore } from '@/store/auth';

import type {
  AlarmQuery,
  ApplicationQuery,
  AuditQuery,
  BindingQuery,
  DeviceQuery,
  OnboardingAction,
  TenantQuery,
  WorkOrderQuery,
} from './types';
import type {
  Alarm,
  AlarmRule,
  AuditLog,
  Binding,
  BindingHistory,
  ChartSeriesData,
  Component,
  Device,
  Dispute,
  DisputeVerdict,
  Notification,
  OnboardingApplication,
  PageResult,
  ProgressRecord,
  SlaConfigRow,
  SparePart,
  StatCardData,
  Tenant,
  TenantAccount,
  TimelineRecord,
  TodoItem,
  VendorSlaStat,
  WorkOrder,
} from '@/types';

/** 当前操作人（写操作统一署名） */
function operatorName(): string {
  const auth = useAuthStore();
  return auth.userInfo?.displayName ?? '平台运营';
}

/** 当前操作人角色 */
function operatorRole() {
  return useAuthStore().userInfo?.accountRole ?? 'OPS';
}

/* ============================================================
 * 总览看板
 * ============================================================ */

/** 平台总览 */
export function getOverview(): Promise<{ kpis: StatCardData[]; todoList: TodoItem[] }> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const db = getDb();

  const devices = scopedQuery(db.devices, scope, {}).list;
  const vendors = db.tenants.filter((t) => t.type === 'VENDOR');
  const activeVendors = vendors.filter((t) => t.auditStatus === 'ACTIVE');
  const customers = db.tenants.filter((t) => t.type === 'CUSTOMER');
  const alarms = scopedQuery(db.alarms, scope, {}).list;
  const unconfirmed = alarms.filter((a) => a.status === 'UNCONFIRMED');
  const orders = scopedQuery(db.workOrders, scope, {}).list;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_ACCEPT');
  const applications = db.onboardingApplications;

  const kpis: StatCardData[] = [
    { key: 'vendors', label: '入驻厂家', value: activeVendors.length, unit: '家', trend: 8.3, tone: 'primary', to: '/platform/tenants' },
    { key: 'customers', label: '客户租户', value: customers.length, unit: '家', trend: 5.1, tone: 'info', to: '/platform/tenants' },
    { key: 'devices', label: '在管设备', value: devices.length, unit: '台', trend: 12.6, tone: 'success', to: '/platform/devices' },
    { key: 'alarms', label: '今日告警', value: alarms.filter((a) => isToday(a.triggerTime)).length, unit: '条', trend: -4.2, tone: 'warning', to: '/platform/alarms' },
    { key: 'orders', label: '待接单工单', value: pendingOrders.length, unit: '单', trend: 3.8, tone: 'danger', to: '/platform/work-orders' },
    { key: 'applications', label: '待审入驻申请', value: applications.filter((a) => a.status === 'PENDING_PRIMARY' || a.status === 'PENDING_SECONDARY').length, unit: '份', trend: 16.7, tone: 'purple', to: '/platform/review/applications' },
  ];

  const todoList: TodoItem[] = [
    { id: 't1', label: '待初审入驻申请', count: applications.filter((a) => a.status === 'PENDING_PRIMARY').length, to: '/platform/review/applications', tone: 'warning' },
    { id: 't2', label: '待复审入驻申请', count: applications.filter((a) => a.status === 'PENDING_SECONDARY').length, to: '/platform/review/applications', tone: 'warning' },
    { id: 't3', label: '未确认告警', count: unconfirmed.length, to: '/platform/alarms', tone: 'danger' },
    { id: 't4', label: '待接单工单', count: pendingOrders.length, to: '/platform/work-orders', tone: 'danger' },
    { id: 't5', label: '试运营厂家', count: vendors.filter((v) => v.auditStatus === 'TRIAL').length, to: '/platform/tenants', tone: 'info' },
    { id: 't6', label: '待仲裁争议', count: db.disputes.filter((d) => !d.verdict).length, to: '/platform/disputes', tone: 'purple' },
  ];

  return delay({ kpis, todoList });
}

/** 告警趋势（近 N 天） */
export function getAlarmTrend(days: number): Promise<Array<{ date: string; count: number }>> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const db = getDb();
  const alarms = scopedQuery(db.alarms, scope, {}).list;
  const dates = lastDays(days);
  // 按 YYYY-MM-DD 精确分桶，避免时区跨日导致落到相邻桶
  const bucket = new Map<string, number>();
  alarms.forEach((a) => {
    const day = a.triggerTime.slice(0, 10);
    bucket.set(day, (bucket.get(day) ?? 0) + 1);
  });
  return delay(dates.map((date) => ({ date, count: bucket.get(date) ?? 0 })));
}

/** 告警等级分布 */
export function getAlarmLevelDist(): Promise<ChartSeriesData[]> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const alarms = scopedQuery(getDb().alarms, scope, {}).list;
  const order: Array<[string, string]> = [['URGENT', '紧急'], ['IMPORTANT', '重要'], ['NORMAL', '一般']];
  return delay(
    order.map(([code, name]) => ({
      name,
      value: alarms.filter((a) => a.level === code).length,
    })),
  );
}

/** 设备品类分布 */
export function getCategoryDist(): Promise<ChartSeriesData[]> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const devices = scopedQuery(getDb().devices, scope, {}).list;
  return delay(
    Object.entries(DEVICE_CATEGORY_LABEL).map(([code, name]) => ({
      name,
      value: devices.filter((d) => d.category === code).length,
    })),
  );
}

/** 厂家 SLA 排名 */
export function getVendorSlaRank(quarter: string): Promise<Array<{ vendorId: string; vendorName: string; rate: number }>> {
  const db = getDb();
  const rows = db.vendorSlaStats.filter((s) => s.quarter === quarter);
  const merged = db.tenants
    .filter((t) => t.type === 'VENDOR')
    .map((t) => {
      const list = rows.filter((s) => s.vendorId === t.id);
      const rate = list.length
        ? Math.round((list.reduce((s, r) => s + r.onTimeHandleRate, 0) / list.length) * 10) / 10
        : 0;
      return { vendorId: t.id, vendorName: t.shortName, rate };
    })
    .sort((a, b) => b.rate - a.rate);
  return delay(merged);
}

/** 可选季度列表 */
export function getQuarters(): Promise<string[]> {
  return delay(QUARTERS);
}

/* ============================================================
 * 入驻审核
 * ============================================================ */

/** 入驻申请列表 */
export function getApplicationList(q: ApplicationQuery): Promise<PageResult<OnboardingApplication>> {
  const db = getDb();
  return delay(
    scopedQuery(db.onboardingApplications, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['id', 'vendorName', 'legalEntity'],
      sortBy: 'submitTime',
      sortOrder: 'desc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (a) =>
        (q.status ? a.status === q.status : true) && (q.vendorType ? a.vendorType === q.vendorType : true),
    }),
  );
}

/** 审核检查项（四个维度） */
export interface AuditChecklistItem {
  key: string;
  dimension: string;
  label: string;
  passed: boolean;
  comment?: string;
}

/** 入驻申请详情 */
export function getApplicationDetail(id: string): Promise<{
  application: OnboardingApplication;
  timeline: TimelineRecord[];
  checklist: AuditChecklistItem[];
}> {
  const db = getDb();
  const app = scopedFind(db.onboardingApplications, 'id', id, resolveScope(useAuthStore()));
  if (!app) return Promise.reject(new Error('入驻申请不存在或不在当前数据范围内'));
  const timeline = db.onboardingTimelines.filter((t) => t.bizId === id);
  const checklist: AuditChecklistItem[] = [
    { key: 'legal', dimension: '主体资质', label: '营业执照与法人身份一致', passed: Boolean(app.licenseNo && app.legalPerson) },
    { key: 'product', dimension: '产品能力', label: '产品型号具备物联网接入能力', passed: app.productModels.length > 0 && app.productModels.every((m) => Boolean(m.protocol)) },
    { key: 'service', dimension: '售后能力', label: '工程师数量与服务半径满足覆盖', passed: app.engineerCount >= 5 && Boolean(app.serviceRadius) },
    { key: 'business', dimension: '商务条件', label: 'SLA 时限承诺已确认', passed: app.slaCommitment.handleHours > 0 },
  ];
  return delay({ application: app, timeline, checklist });
}

/**
 * 入驻申请状态流转
 * @param id 申请 id
 * @param action 动作键
 * @param payload 备注 / 技术对接 / 商务条件
 * @returns 流转后的申请
 */
export function transitionApplication(
  id: string,
  action: OnboardingAction,
  payload: {
    remark: string;
    techIntegration?: OnboardingApplication['techIntegration'];
    slaCommitment?: OnboardingApplication['slaCommitment'];
  },
): Promise<OnboardingApplication> {
  const db = getDb();
  const targets: Record<string, string> = {
    submit: 'PENDING_PRIMARY',
    passPrimary: 'PENDING_SECONDARY',
    returnBack: 'RECTIFY',
    markRectify: 'RECTIFY',
    passSecondary: 'TRIAL',
    resubmit: 'PENDING_SECONDARY',
    restart: 'DRAFT',
    confirmActive: 'ACTIVE',
    reject: 'REJECTED',
  };
  const to = targets[action];
  if (!to) return Promise.reject(new Error(`未知的入驻动作：${action}`));

  const patch: Record<string, unknown> = {};
  if (action === 'returnBack' || action === 'markRectify') patch.rectifyReason = payload.remark;
  if (action === 'reject') patch.rejectReason = payload.remark;
  if (action === 'passPrimary') patch.reviewer = operatorName();
  if (payload.techIntegration) patch.techIntegration = payload.techIntegration;
  if (payload.slaCommitment) patch.slaCommitment = payload.slaCommitment;
  if (action === 'confirmActive') patch.stayDays = TRIAL_DAYS + 30;
  if (action === 'submit' || action === 'resubmit') patch.submitTime = new Date().toISOString();
  if (action === 'restart') {
    patch.rejectReason = undefined;
    patch.rectifyReason = undefined;
  }

  try {
    applyTransition({
      collection: 'onboardingApplications',
      id,
      to,
      action,
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: payload.remark,
      patch,
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(scopedFind(db.onboardingApplications, 'id', id, resolveScope(useAuthStore()))!);
}

/* ============================================================
 * 租户
 * ============================================================ */

/** 租户列表 */
export function getTenantList(q: TenantQuery): Promise<PageResult<Tenant>> {
  const db = getDb();
  return delay(
    scopedQuery(db.tenants, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['id', 'name', 'shortName', 'contact'],
      sortBy: 'id',
      sortOrder: 'asc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (t) =>
        (q.type ? t.type === q.type : true) &&
        (q.status ? t.status === q.status : true) &&
        (q.auditStatus ? t.auditStatus === q.auditStatus : true),
    }),
  );
}

/** 租户详情 */
export function getTenantDetail(id: string): Promise<{
  tenant: Tenant;
  accounts: TenantAccount[];
  stats: { devices: number; alarms: number; workOrders: number; bindings: number };
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const tenant = scopedFind(db.tenants, 'id', id, scope);
  if (!tenant) return Promise.reject(new Error('租户不存在或不在当前数据范围内'));
  const devices = scopedQuery(db.devices, scope, { filter: (d) => tenant.type === 'VENDOR' ? (d.vendorIds ?? []).includes(tenant.id) : d.ownerCustomerId === tenant.id }).list;
  const snSet = new Set(devices.map((d) => d.sn));
  return delay({
    tenant,
    accounts: db.tenantAccounts.filter((a) => a.tenantId === tenant.id),
    stats: {
      devices: devices.length,
      alarms: scopedQuery(db.alarms, scope, { filter: (a) => snSet.has(a.deviceSn) }).total,
      workOrders: scopedQuery(db.workOrders, scope, { filter: (o) => snSet.has(o.deviceSn) }).total,
      bindings: scopedQuery(db.bindings, scope, { filter: (b) => snSet.has(b.deviceSn) }).total,
    },
  });
}

/** 新建租户 */
export function createTenant(payload: Partial<Tenant>): Promise<Tenant> {
  const db = getDb();
  const seq = db.tenants.length + 1;
  const tenant: Tenant = {
    id: `TEN-${String(seq).padStart(4, '0')}`,
    name: payload.name ?? '新建租户',
    shortName: payload.shortName ?? payload.name ?? '新建租户',
    type: payload.type ?? 'CUSTOMER',
    auditStatus: payload.auditStatus ?? 'ACTIVE',
    status: payload.status ?? 'ACTIVE',
    contact: payload.contact ?? '',
    contactPhone: payload.contactPhone ?? '',
    serviceScope: payload.serviceScope ?? [],
    createdAt: new Date().toISOString(),
    validFrom: payload.validFrom ?? new Date().toISOString(),
    validTo: payload.validTo ?? new Date(Date.now() + 1095 * 86_400_000).toISOString(),
  };
  db.tenants.push(tenant);
  return delay(tenant);
}

/** 更新租户 */
export function updateTenant(id: string, payload: Partial<Tenant>): Promise<Tenant> {
  const db = getDb();
  const hit = db.tenants.find((t) => t.id === id);
  if (!hit) return Promise.reject(new Error('租户不存在'));
  Object.assign(hit, payload);
  return delay(hit);
}

/** 冻结 / 解冻租户 */
export function toggleTenantStatus(id: string, freeze: boolean): Promise<void> {
  const db = getDb();
  const hit = db.tenants.find((t) => t.id === id);
  if (!hit) return Promise.reject(new Error('租户不存在'));
  hit.status = freeze ? 'FROZEN' : 'ACTIVE';
  db.auditLogs.unshift({
    id: nextId('LOG'),
    operator: operatorName(),
    tenantId: id,
    action: 'ACCOUNT_MANAGE',
    target: `租户 ${id}`,
    before: `status=${freeze ? 'ACTIVE' : 'FROZEN'}`,
    after: `status=${hit.status}`,
    ip: '10.0.0.1',
    time: new Date().toISOString(),
  });
  return delay(undefined);
}

/* ============================================================
 * 设备（只读）
 * ============================================================ */

/** 设备台账列表（平台方只读） */
export function getDeviceList(q: DeviceQuery): Promise<PageResult<Device>> {
  const db = getDb();
  return delay(
    scopedQuery(db.devices, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['sn', 'name', 'modelCode', 'location'],
      sortBy: (q.sortBy ?? 'lastReportAt') as keyof Device,
      sortOrder: q.sortOrder ?? 'desc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (d) =>
        (q.category ? d.category === q.category : true) &&
        (q.status ? d.status === q.status : true) &&
        (q.modelCode ? d.modelCode === q.modelCode : true) &&
        (q.vendorId ? (d.vendorIds ?? []).includes(q.vendorId) : true) &&
        (q.ownerCustomerId ? d.ownerCustomerId === q.ownerCustomerId : true),
    }),
  );
}

/** 设备详情（5 Tab 数据） */
export function getDeviceDetail(sn: string): Promise<{
  device: Device;
  components: Component[];
  bindings: Binding[];
  alarms: Alarm[];
  workOrders: WorkOrder[];
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const device = scopedFind(db.devices, 'sn', sn, scope);
  if (!device) return Promise.reject(new Error('设备不存在或不在当前数据范围内'));
  return delay({
    device,
    components: db.components.filter((c) => c.deviceSn === sn),
    bindings: scopedQuery(db.bindings, scope, { filter: (b) => b.deviceSn === sn }).list,
    alarms: scopedQuery(db.alarms, scope, { filter: (a) => a.deviceSn === sn }).list,
    workOrders: scopedQuery(db.workOrders, scope, { filter: (o) => o.deviceSn === sn }).list,
  });
}

/* ============================================================
 * 绑定（只读）
 * ============================================================ */

/** 绑定列表（含设备/客户/厂家名） */
export function getBindingList(
  q: BindingQuery,
): Promise<PageResult<Binding & { deviceName: string; customerName: string; vendorName: string }>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const paged = scopedQuery(db.bindings, scope, {
    keyword: q.keyword,
    searchFields: ['id', 'deviceSn'],
    sortBy: 'effectiveFrom',
    sortOrder: 'desc',
    page: q.page,
    pageSize: q.pageSize,
    filter: (b) =>
      (q.status ? b.status === q.status : true) &&
      (q.type ? b.type === q.type : true) &&
      (q.vendorId ? b.vendorId === q.vendorId : true) &&
      (q.customerId ? b.customerId === q.customerId : true),
  });
  const nameOf = (id: string): string => db.tenants.find((t) => t.id === id)?.shortName ?? id;
  // 关联字段只影响展示，不参与分页；total 沿用管道分页后的结果
  return delay({
    list: paged.list.map((b) => ({
      ...b,
      deviceName: db.devices.find((d) => d.sn === b.deviceSn)?.name ?? b.deviceSn,
      customerName: nameOf(b.customerId),
      vendorName: nameOf(b.vendorId),
    })),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/** 绑定变更历史 */
export function getBindingHistory(bindingId: string): Promise<BindingHistory[]> {
  const db = getDb();
  return delay(db.bindingHistory.filter((h) => h.bindingId === bindingId));
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
        (q.source ? a.source === q.source : true) &&
        (q.deviceSn ? a.deviceSn === q.deviceSn : true) &&
        (q.vendorId ? a.vendorId === q.vendorId : true) &&
        (q.dateRange && q.dateRange[0] && q.dateRange[1]
          ? a.triggerTime >= q.dateRange[0] && a.triggerTime <= `${q.dateRange[1]}T23:59:59.999Z`
          : true),
    }),
  );
}

/** 实时告警流（按触发时间倒序取 N 条） */
export function getRealtimeAlarms(limit = 12): Promise<Alarm[]> {
  const db = getDb();
  const rows = scopedQuery(db.alarms, resolveScope(useAuthStore()), {
    sortBy: 'triggerTime',
    sortOrder: 'desc',
  }).list;
  return delay(rows.slice(0, limit));
}

/**
 * 告警状态流转
 * @param id 告警 id
 * @param action 动作键
 * @returns 流转后的告警
 */
export function transitionAlarm(id: string, action: 'confirm' | 'process' | 'recover'): Promise<Alarm> {
  const db = getDb();
  const actionKey = action === 'confirm' ? 'confirmAlarm' : action;
  const targets: Record<string, string> = { confirmAlarm: 'CONFIRMED', process: 'PROCESSING', recover: 'RECOVERED' };
  const to = targets[actionKey];
  try {
    applyTransition({
      collection: 'alarms',
      id,
      to,
      action: actionKey,
      operator: operatorName(),
      operatorRole: operatorRole(),
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(scopedFind(db.alarms, 'id', id, resolveScope(useAuthStore()))!);
}

/** 告警类型字典（平台端图表用） */
export function getAlarmTypes(): Promise<ChartSeriesData[]> {
  return delay(ALARM_TYPE_OPTIONS.map((o) => ({ name: o.label, value: 0 })));
}

/** 告警类型 → 指标键映射 */
export { ALARM_METRIC_MAP };

/* ============================================================
 * 工单（只读 + 标记争议）
 * ============================================================ */

/** 工单列表 */
export function getWorkOrderList(q: WorkOrderQuery): Promise<PageResult<WorkOrder>> {
  const db = getDb();
  return delay(
    scopedQuery(db.workOrders, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['code', 'deviceSn', 'description'],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (o) =>
        (q.status ? o.status === q.status : true) &&
        (q.priority ? o.priority === q.priority : true) &&
        (q.vendorId ? o.vendorId === q.vendorId : true) &&
        (q.slaTimeout === undefined ? true : o.escalationLevel >= (q.slaTimeout ? 1 : 0)),
    }),
  );
}

/**
 * 标记争议（平台方唯一可执行的工单动作，PRD Q6）
 * @param orderCode 工单编号
 * @param remark 争议原因（必填）
 */
export function markDispute(orderCode: string, remark: string): Promise<void> {
  if (!remark) return Promise.reject(new Error('争议原因不能为空'));
  const db = getDb();
  const order = db.workOrders.find((o) => o.code === orderCode);
  if (!order) return Promise.reject(new Error('工单不存在'));
  order.disputeFlag = true;
  appendTimeline('workOrders', orderCode, 'dispute', operatorName(), remark, operatorRole());
  db.auditLogs.unshift({
    id: nextId('LOG'),
    operator: operatorName(),
    tenantId: order.customerId,
    action: 'ORDER_HANDLE',
    target: `工单 ${orderCode}`,
    before: 'disputeFlag=false',
    after: 'disputeFlag=true',
    ip: '10.0.0.1',
    time: new Date().toISOString(),
  });
  return delay(undefined);
}

/**
 * 工单详情（平台方只读视角）
 *
 * ⚠️ 平台方对工单只有「查看 + 标记争议」权限（PRD Q6），没有接单/处理/验收动作，
 *    因此这里只返回只读视图所需的数据，不暴露任何写操作入口。
 * @param code 工单编号
 */
export function getWorkOrderDetail(code: string): Promise<{
  order: WorkOrder & { deviceName: string; customerName: string; vendorName: string };
  timeline: TimelineRecord[];
  device: Device | null;
  progress: ProgressRecord[];
  spareParts: SparePart[];
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const order = scopedFind(db.workOrders, 'code', code, scope);
  if (!order) return Promise.reject(new Error('工单不存在或不在当前数据范围内'));
  return delay({
    order: {
      ...order,
      deviceName: db.devices.find((d) => d.sn === order.deviceSn)?.name ?? order.deviceSn,
      customerName: db.tenants.find((t) => t.id === order.customerId)?.shortName ?? order.customerId,
      vendorName: db.tenants.find((t) => t.id === order.vendorId)?.shortName ?? order.vendorId,
    },
    timeline: db.workOrderTimelines.filter((t) => t.bizId === code),
    device: db.devices.find((d) => d.sn === order.deviceSn) ?? null,
    progress: db.workOrderProgress.filter((p) => p.orderCode === code),
    spareParts: db.spareParts.filter((s) => s.orderCode === code),
  });
}

/** 工单问题类型字典 */
export function getProblemTypes(): Promise<Array<{ label: string; value: string }>> {
  return delay(Object.entries(PROBLEM_TYPE_LABEL).map(([value, label]) => ({ label, value })));
}

/* ============================================================
 * 争议 / 考核 / 通知 / 审计 / 配置
 * ============================================================ */

/** 争议列表 */
export function getDisputeList(q: { page: number; pageSize: number; keyword?: string }): Promise<PageResult<Dispute>> {
  const db = getDb();
  return delay(
    scopedQuery(db.disputes, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['id', 'orderCode', 'type'],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: q.page,
      pageSize: q.pageSize,
    }),
  );
}

/** 争议详情 */
export function getDisputeDetail(id: string): Promise<{ dispute: Dispute; order: WorkOrder | null }> {
  const db = getDb();
  const dispute = db.disputes.find((d) => d.id === id);
  if (!dispute) return Promise.reject(new Error('争议不存在'));
  return delay({ dispute, order: db.workOrders.find((o) => o.code === dispute.orderCode) ?? null });
}

/** 仲裁判定 */
export function judgeDispute(id: string, payload: { verdict: DisputeVerdict; note: string }): Promise<Dispute> {
  const db = getDb();
  const dispute = db.disputes.find((d) => d.id === id);
  if (!dispute) return Promise.reject(new Error('争议不存在'));
  dispute.verdict = payload.verdict;
  dispute.verdictNote = payload.note;
  dispute.verdictTime = new Date().toISOString();
  dispute.operator = operatorName();
  return delay(dispute);
}

/** 履约考核列表 */
export function getVendorPerformance(
  quarter: string,
): Promise<Array<VendorSlaStat & { vendorName: string; deviceCount: number }>> {
  const db = getDb();
  const rows = db.vendorSlaStats.filter((s) => s.quarter === quarter);
  return delay(
    rows.map((s) => {
      const vendor = db.tenants.find((t) => t.id === s.vendorId);
      const deviceCount = db.devices.filter((d) => (d.vendorIds ?? []).includes(s.vendorId)).length;
      return { ...s, vendorName: vendor?.shortName ?? s.vendorId, deviceCount };
    }),
  );
}

/** 通知中心（平台方） */
export function getNotificationList(q: { page: number; pageSize: number; keyword?: string; isRead?: boolean }): Promise<PageResult<Notification>> {
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

/** 审计日志 */
export function getAuditLogList(q: AuditQuery): Promise<PageResult<AuditLog>> {
  const db = getDb();
  return delay(
    scopedQuery(db.auditLogs, resolveScope(useAuthStore()), {
      keyword: q.keyword,
      searchFields: ['operator', 'target'],
      sortBy: 'time',
      sortOrder: 'desc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (l) =>
        (q.action ? l.action === q.action : true) &&
        (q.operator ? l.operator === q.operator : true) &&
        (q.dateRange && q.dateRange[0] && q.dateRange[1]
          ? l.time >= q.dateRange[0] && l.time <= `${q.dateRange[1]}T23:59:59.999Z`
          : true),
    }),
  );
}

/** 告警规则列表 */
export function getAlarmRuleList(): Promise<AlarmRule[]> {
  return delay(getDb().alarmRules);
}

/** 保存告警规则 */
export function saveAlarmRule(rule: AlarmRule): Promise<AlarmRule> {
  const db = getDb();
  const hit = db.alarmRules.find((r) => r.id === rule.id);
  if (hit) {
    Object.assign(hit, rule, { updatedAt: new Date().toISOString() });
    return delay(hit);
  }
  const created: AlarmRule = { ...rule, id: rule.id || nextId('RULE'), updatedAt: new Date().toISOString() };
  db.alarmRules.unshift(created);
  return delay(created);
}

/** 启停告警规则 */
export function toggleAlarmRule(id: string, enabled: boolean): Promise<void> {
  const db = getDb();
  const hit = db.alarmRules.find((r) => r.id === id);
  if (!hit) return Promise.reject(new Error('规则不存在'));
  hit.enabled = enabled;
  hit.updatedAt = new Date().toISOString();
  return delay(undefined);
}

/** SLA 配置列表 */
export function getSlaConfig(): Promise<SlaConfigRow[]> {
  return delay(getDb().slaConfig);
}

/** 保存 SLA 配置 */
export function saveSlaConfig(rows: SlaConfigRow[]): Promise<SlaConfigRow[]> {
  const db = getDb();
  db.slaConfig = rows.map((r) => ({ ...r }));
  return delay(db.slaConfig);
}

/** 判断是否今天（告警趋势用） */
function isToday(iso: string): boolean {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

/** 平台方 API 对象 */
export const platformApi = {
  getOverview,
  getAlarmTrend,
  getAlarmLevelDist,
  getCategoryDist,
  getVendorSlaRank,
  getQuarters,
  getApplicationList,
  getApplicationDetail,
  transitionApplication,
  getTenantList,
  getTenantDetail,
  createTenant,
  updateTenant,
  toggleTenantStatus,
  getDeviceList,
  getDeviceDetail,
  getBindingList,
  getBindingHistory,
  getAlarmList,
  getRealtimeAlarms,
  transitionAlarm,
  getAlarmTypes,
  getWorkOrderList,
  getWorkOrderDetail,
  markDispute,
  getProblemTypes,
  getDisputeList,
  getDisputeDetail,
  judgeDispute,
  getVendorPerformance,
  getNotificationList,
  getAuditLogList,
  getAlarmRuleList,
  saveAlarmRule,
  toggleAlarmRule,
  getSlaConfig,
  saveSlaConfig,
};