/**
 * 厂家端 API 层（当前为 mock 实现，延迟 200ms）
 *
 * 接入真实后端三步：
 *   1. 安装 axios，在 vite.config.ts 打开 /api 代理；
 *   2. 将下方各方法体替换为真实请求；
 *   3. 返回数据结构保持不变，上层页面零改动。
 *
 * 数据隔离：所有列表方法必须经 resolveScope(useAuthStore()) 注入范围，
 * 禁止在方法体内直接返回 getDb().xxx 全量数组。
 */
import { MODEL_WARRANTY } from '@/mock/factories/catalog';
import { addHours } from '@/utils/date';
import { TRIAL_DAYS, slaOf } from '@/constants/sla';

import { delay } from '@/mock/delay';
import { appendTimeline, applyTransition, getDb, nextId } from '@/mock/db';
import { scopedFind, scopedMutate, scopedQuery } from '@/mock/query';
import { resolveScope } from '@/mock/scope';

import { useAuthStore } from '@/store/auth';

import type { AlarmQuery, BindingQuery, DeviceQuery, WorkOrderQuery } from './types';
import type {
  Alarm,
  AlarmStatus,
  Attachment,
  Binding,
  ChartSeriesData,
  Component,
  CustomerThreshold,
  Device,
  DeviceMetricPoint,
  ImportErrorRow,
  ImportResult,
  ModelStatus,
  OnboardingApplication,
  PageResult,
  ParsedRows,
  Priority,
  ProductModel,
  ProgressRecord,
  SparePart,
  StatCardData,
  Tenant,
  TenantAccount,
  TimelineRecord,
  TodoItem,
  UsageOverview,
  VendorSlaStat,
  WorkOrder,
} from '@/types';

/** 当前操作人 */
function operatorName(): string {
  const auth = useAuthStore();
  return auth.userInfo?.displayName ?? '厂家运营';
}

/** 当前操作人角色 */
function operatorRole() {
  return useAuthStore().userInfo?.accountRole ?? 'VENDOR_ADMIN';
}

/** 本厂厂家 id（页面调用前应已登录） */
function selfVendorId(): string {
  return useAuthStore().vendorId ?? '';
}

/* ============================================================
 * 工作台
 * ============================================================ */

/** 厂家工作台 */
export function getDashboard(): Promise<{
  kpis: StatCardData[];
  todos: TodoItem[];
  alarmTrend: Array<{ date: string; count: number }>;
  orderStats: ChartSeriesData[];
  bindingOverview: ChartSeriesData[];
}> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const db = getDb();

  const devices = scopedQuery(db.devices, scope, {}).list;
  const alarms = scopedQuery(db.alarms, scope, {}).list;
  const orders = scopedQuery(db.workOrders, scope, {}).list;
  const bindings = scopedQuery(db.bindings, scope, {}).list;

  const kpis: StatCardData[] = [
    { key: 'devices', label: '本厂家设备', value: devices.length, unit: '台', trend: 6.4, tone: 'primary', to: '/vendor/devices' },
    { key: 'alarms', label: '未确认告警', value: alarms.filter((a) => a.status === 'UNCONFIRMED').length, unit: '条', trend: -8.1, tone: 'danger', to: '/vendor/alarms' },
    { key: 'orders', label: '待接单工单', value: orders.filter((o) => o.status === 'PENDING_ACCEPT').length, unit: '单', trend: 11.2, tone: 'warning', to: '/vendor/work-orders' },
    { key: 'progress', label: '处理中工单', value: orders.filter((o) => o.status === 'IN_PROGRESS').length, unit: '单', trend: 2.4, tone: 'info', to: '/vendor/work-orders' },
    { key: 'confirm', label: '待客户验收', value: orders.filter((o) => o.status === 'PENDING_CONFIRM').length, unit: '单', trend: -3.2, tone: 'purple', to: '/vendor/work-orders' },
    { key: 'bindings', label: '生效绑定', value: bindings.filter((b) => b.status === 'ACTIVE').length, unit: '条', trend: 4.9, tone: 'success', to: '/vendor/bindings' },
  ];

  const todos: TodoItem[] = [
    { id: 'v1', label: '待接单工单', count: orders.filter((o) => o.status === 'PENDING_ACCEPT').length, to: '/vendor/work-orders', tone: 'warning' },
    { id: 'v2', label: '处理中工单', count: orders.filter((o) => o.status === 'IN_PROGRESS').length, to: '/vendor/work-orders', tone: 'primary' },
    { id: 'v3', label: '未确认告警', count: alarms.filter((a) => a.status === 'UNCONFIRMED').length, to: '/vendor/alarms', tone: 'danger' },
    { id: 'v4', label: '客户待确认绑定', count: bindings.filter((b) => b.status === 'PENDING_CONFIRM').length, to: '/vendor/bindings', tone: 'info' },
    { id: 'v5', label: 'SLA 超时工单', count: orders.filter((o) => o.escalationLevel >= 2).length, to: '/vendor/work-orders', tone: 'danger' },
  ];

  // 近 7 天告警趋势
  const alarmTrend: Array<{ date: string; count: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    alarmTrend.push({ date: day, count: alarms.filter((a) => a.triggerTime.slice(0, 10) === day).length });
  }

  const orderStats: ChartSeriesData[] = [
    { name: '待接单', value: orders.filter((o) => o.status === 'PENDING_ACCEPT').length },
    { name: '处理中', value: orders.filter((o) => o.status === 'IN_PROGRESS').length },
    { name: '待验收', value: orders.filter((o) => o.status === 'PENDING_CONFIRM').length },
    { name: '已完成', value: orders.filter((o) => o.status === 'COMPLETED').length },
    { name: '已关闭', value: orders.filter((o) => o.status === 'CLOSED').length },
  ];

  const bindingOverview: ChartSeriesData[] = [
    { name: '产权绑定', value: bindings.filter((b) => b.type === 'OWNERSHIP').length },
    { name: '装配绑定', value: bindings.filter((b) => b.type === 'ASSEMBLY').length },
    { name: '待确认', value: bindings.filter((b) => b.status === 'PENDING_CONFIRM').length },
    { name: '待解除', value: bindings.filter((b) => b.status === 'PENDING_RELEASE').length },
  ];

  return delay({ kpis, todos, alarmTrend, orderStats, bindingOverview });
}

/* ============================================================
 * 入驻申请
 * ============================================================ */

/** 取本厂入驻申请（未入驻返回 null） */
export function getMyOnboarding(): Promise<OnboardingApplication | null> {
  const db = getDb();
  const auth = useAuthStore();
  // 按 tenantId 精确匹配；未入驻厂家在租户表里是 PENDING/DRAFT，此时没有申请记录，返回 null
  const exact = db.onboardingApplications.find((a) => a.tenantId === auth.tenantId);
  return delay(exact ?? null);
}

/** 保存入驻申请草稿 */
export function saveOnboardingDraft(payload: Partial<OnboardingApplication>): Promise<OnboardingApplication> {
  const db = getDb();
  const auth = useAuthStore();
  const existing = db.onboardingApplications.find((a) => a.tenantId === auth.tenantId);
  if (existing) {
    // 非草稿态字段锁定，只更新允许变更的部分
    if (existing.status === 'DRAFT') {
      Object.assign(existing, payload, { status: 'DRAFT' });
    }
    return delay(existing);
  }
  const created: OnboardingApplication = {
    id: nextId('ONB').replace('-X', '-2026-'),
    vendorName: payload.vendorName ?? auth.tenantName,
    vendorType: payload.vendorType ?? auth.vendorType ?? 'COOKWARE',
    tenantId: auth.tenantId,
    status: 'DRAFT',
    stayDays: 0,
    legalEntity: payload.legalEntity ?? '',
    licenseNo: payload.licenseNo ?? '',
    legalPerson: payload.legalPerson ?? '',
    registeredAddress: payload.registeredAddress ?? '',
    productModels: payload.productModels ?? [],
    engineerCount: payload.engineerCount ?? 0,
    serviceRadius: payload.serviceRadius ?? '',
    hasSpareWarehouse: payload.hasSpareWarehouse ?? false,
    slaCommitment: payload.slaCommitment ?? slaOf('NORMAL'),
    attachments: payload.attachments ?? [],
    createdAt: new Date().toISOString(),
  };
  db.onboardingApplications.unshift(created);
  return delay(created);
}

/** 提交入驻审核（→ PENDING_PRIMARY，字段锁定） */
export function submitOnboarding(id: string): Promise<OnboardingApplication> {
  const db = getDb();
  try {
    applyTransition({
      collection: 'onboardingApplications',
      id,
      to: 'PENDING_PRIMARY',
      action: 'submit',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: '提交入驻申请，关键字段已锁定',
      patch: { submitTime: new Date().toISOString() },
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  useAuthStore().setOnboardingStatus('PENDING_PRIMARY');
  return delay(db.onboardingApplications.find((a) => a.id === id)!);
}

/** 提交整改材料（→ PENDING_SECONDARY） */
export function resubmitRectify(id: string, payload: Partial<OnboardingApplication>): Promise<OnboardingApplication> {
  const db = getDb();
  try {
    applyTransition({
      collection: 'onboardingApplications',
      id,
      to: 'PENDING_SECONDARY',
      action: 'resubmit',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: '已提交整改材料，请平台复审',
      patch: payload,
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  useAuthStore().setOnboardingStatus('PENDING_SECONDARY');
  return delay(db.onboardingApplications.find((a) => a.id === id)!);
}

/** 重新发起申请（REJECTED → DRAFT） */
export function restartOnboarding(id: string): Promise<OnboardingApplication> {
  const db = getDb();
  try {
    applyTransition({
      collection: 'onboardingApplications',
      id,
      to: 'DRAFT',
      action: 'restart',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: '重新发起入驻申请',
      patch: { rejectReason: undefined, rectifyReason: undefined },
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  useAuthStore().setOnboardingStatus('DRAFT');
  return delay(db.onboardingApplications.find((a) => a.id === id)!);
}

/** 入驻申请时间轴 */
export function getOnboardingTimeline(id: string): Promise<TimelineRecord[]> {
  const db = getDb();
  return delay(db.onboardingTimelines.filter((t) => t.bizId === id));
}

/** 试运营天数说明 */
export function getTrialNotice(): Promise<{ days: number; text: string }> {
  return delay({
    days: TRIAL_DAYS,
    text: `试运营期为 ${TRIAL_DAYS} 天（时长口径待 Phil 确认），期间可使用设备台账与工单处理能力`,
  });
}

/* ============================================================
 * 产品型号
 * ============================================================ */

/** 型号列表 */
export function getModelList(q: { page: number; pageSize: number; keyword?: string; category?: string; status?: ModelStatus }): Promise<PageResult<ProductModel>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  // 型号表没有 sn / customerId 字段，scope 的 visibleVendorIds 会用它做厂家维度过滤
  return delay(
    scopedQuery(db.productModels, scope, {
      keyword: q.keyword,
      searchFields: ['modelCode', 'name'],
      sortBy: 'modelCode',
      sortOrder: 'asc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (m) => (q.category ? m.category === q.category : true) && (q.status ? m.status === q.status : true),
    }),
  );
}

/** 保存型号 */
export function saveModel(payload: Partial<ProductModel>): Promise<ProductModel> {
  const db = getDb();
  const auth = useAuthStore();
  const hit = payload.id ? db.productModels.find((m) => m.id === payload.id) : undefined;
  if (hit) {
    Object.assign(hit, payload);
    return delay(hit);
  }
  const created: ProductModel = {
    id: payload.id ?? nextId('PM'),
    modelCode: payload.modelCode ?? 'CK-NEW-2026',
    name: payload.name ?? '新型号',
    category: payload.category ?? 'COOKING',
    params: payload.params ?? {},
    warrantyMonths: payload.warrantyMonths ?? 12,
    protocol: payload.protocol ?? 'MQTT/JSON',
    vendorId: auth.vendorId ?? '',
    status: payload.status ?? 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
  db.productModels.unshift(created);
  return delay(created);
}

/** 启停型号 */
export function toggleModel(id: string, status: ModelStatus): Promise<void> {
  const db = getDb();
  const hit = db.productModels.find((m) => m.id === id);
  if (!hit) return Promise.reject(new Error('型号不存在'));
  hit.status = status;
  return delay(undefined);
}

/** 可选型号（设备表单用，只返回本厂） */
export function getOwnedModels(): Promise<ProductModel[]> {
  const db = getDb();
  return delay(db.productModels.filter((m) => m.vendorId === selfVendorId()));
}

/* ============================================================
 * 设备
 * ============================================================ */

/** 设备列表（厂家视角，含型号名与厂家名） */
export function getDeviceList(
  q: DeviceQuery,
): Promise<PageResult<Device & { modelName: string; vendorName: string }>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const paged = scopedQuery(db.devices, scope, {
    keyword: q.keyword,
    searchFields: ['sn', 'name', 'modelCode', 'location'],
    sortBy: (q.sortBy ?? 'lastReportAt') as keyof Device,
    sortOrder: q.sortOrder ?? 'desc',
    page: q.page,
    pageSize: q.pageSize,
    filter: (d) =>
      (q.category ? d.category === q.category : true) &&
      (q.status ? d.status === q.status : true) &&
      (q.modelCode ? d.modelCode === q.modelCode : true),
  });
  return delay({
    list: paged.list.map((d) => {
      const model = db.productModels.find((m) => m.modelCode === d.modelCode);
      const vendor = db.tenants.find((t) => t.id === (d.vendorIds?.[0] ?? ''));
      return { ...d, modelName: model?.name ?? d.modelCode, vendorName: vendor?.shortName ?? '—' };
    }),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/** 设备详情（5 Tab） */
export function getDeviceDetail(sn: string): Promise<{
  device: Device;
  components: Component[];
  bindingHistory: import('@/types').BindingHistory[];
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
    bindingHistory: db.bindingHistory.filter((h) => db.bindings.some((b) => b.id === h.bindingId && b.deviceSn === sn)),
    alarms: scopedQuery(db.alarms, scope, { filter: (a) => a.deviceSn === sn }).list,
    workOrders: scopedQuery(db.workOrders, scope, { filter: (o) => o.deviceSn === sn }).list,
  });
}

/** 新增设备（质保期至由型号策略自动计算并置灰） */
export function createDevice(payload: Partial<Device>): Promise<Device> {
  const db = getDb();
  const auth = useAuthStore();
  if (db.devices.some((d) => d.sn === payload.sn)) {
    return Promise.reject(new Error(`SN 已存在：${payload.sn}`));
  }
  const modelCode = payload.modelCode ?? '';
  if (!db.productModels.some((m) => m.modelCode === modelCode)) {
    return Promise.reject(new Error(`型号不存在：${modelCode}`));
  }
  const manufactureDate = payload.manufactureDate ?? new Date().toISOString();
  const device: Device = {
    sn: payload.sn ?? nextId('DEV'),
    name: payload.name ?? '新建设备',
    modelCode,
    category: payload.category ?? 'COOKING',
    manufactureDate,
    warrantyUntil: addHours(manufactureDate, MODEL_WARRANTY[modelCode]! * 24 * 30),
    ownerCustomerId: null,
    status: payload.status ?? 'ONLINE',
    vendorIds: [auth.vendorId ?? ''],
    location: payload.location ?? '',
    alarmCount: 0,
    lastReportAt: new Date().toISOString(),
  };
  db.devices.unshift(device);
  return delay(device);
}

/** 更新设备 */
export function updateDevice(sn: string, payload: Partial<Device>): Promise<Device> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  try {
    // 系统计算字段（warrantyUntil）不允许手改
    const safe = { ...payload };
    delete safe.warrantyUntil;
    delete safe.ownerCustomerId;
    return delay(scopedMutate(db.devices, 'sn', sn, scope, (d) => Object.assign(d, safe)));
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * 批量导入设备（模拟 3 类错误：SN 重复 / 型号不存在 / 必填为空）
 * @param rows 前端解析出的行
 * @returns 成功数与逐行失败原因
 */
export function batchImportDevices(file: ParsedRows): Promise<ImportResult> {
  const db = getDb();
  const auth = useAuthStore();
  const errors: ImportErrorRow[] = [];
  let successCount = 0;

  file.rows.forEach((row, index) => {
    const rowNo = index + 1;
    const sn = (row.sn ?? '').trim();
    const modelCode = (row.modelCode ?? '').trim();
    const name = (row.name ?? '').trim();
    const location = (row.location ?? '').trim();

    if (!sn || !modelCode || !name) {
      errors.push({ rowNo, sn, reason: '必填字段为空（SN / 型号 / 名称）', reasonCode: 'FIELD_EMPTY' });
      return;
    }
    if (db.devices.some((d) => d.sn === sn)) {
      errors.push({ rowNo, sn, reason: `SN 已存在：${sn}`, reasonCode: 'SN_DUPLICATE' });
      return;
    }
    if (!db.productModels.some((m) => m.modelCode === modelCode)) {
      errors.push({ rowNo, sn, reason: `型号不存在：${modelCode}`, reasonCode: 'MODEL_NOT_FOUND' });
      return;
    }
    const model = db.productModels.find((m) => m.modelCode === modelCode)!;
    const manufactureDate = (row.manufactureDate ?? '').trim() || new Date().toISOString();
    if (Number.isNaN(new Date(manufactureDate).getTime())) {
      errors.push({ rowNo, sn, reason: `出厂日期格式不正确：${manufactureDate}`, reasonCode: 'INVALID_DATE' });
      return;
    }

    db.devices.unshift({
      sn,
      name,
      modelCode,
      category: model.category,
      manufactureDate,
      warrantyUntil: addHours(manufactureDate, MODEL_WARRANTY[modelCode]! * 24 * 30),
      ownerCustomerId: null,
      status: 'ONLINE',
      vendorIds: [auth.vendorId ?? ''],
      location: location || '未指定位置',
      alarmCount: 0,
      lastReportAt: new Date().toISOString(),
    });
    successCount += 1;
  });

  return delay({ successCount, errors });
}

/**
 * 申报绑定（2 类系统校验）
 * 1. 客户不在服务范围 → 阻断
 * 2. 已有生效同类型绑定 → 冲突提示
 * @param payload 设备 SN、客户、绑定类型
 * @returns { ok, message?, binding }
 */
export function declareBinding(payload: {
  deviceSn: string;
  customerId: string;
  type: import('@/types').BindingType;
}): Promise<{ ok: boolean; message?: string; binding: Binding }> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const auth = useAuthStore();
  const vendor = db.tenants.find((t) => t.id === auth.vendorId);

  // 校验 1：设备必须在本厂范围内
  const device = scopedFind(db.devices, 'sn', payload.deviceSn, scope);
  if (!device) {
    return delay({ ok: false, message: '设备不存在或不在本厂数据范围内', binding: {} as Binding });
  }

  // 校验 2：客户必须在服务范围内
  if (!vendor?.serviceScope.includes(payload.customerId)) {
    const customerName = db.tenants.find((t) => t.id === payload.customerId)?.shortName ?? payload.customerId;
    return delay({ ok: false, message: `客户「${customerName}」不在本厂家服务范围内，无法申报绑定`, binding: {} as Binding });
  }

  // 校验 3：同设备同类型已有生效绑定 → 冲突
  const active = db.bindings.find(
    (b) => b.deviceSn === payload.deviceSn && b.type === payload.type && b.status === 'ACTIVE',
  );
  if (active) {
    return delay({ ok: false, message: '该设备已存在生效的同类型绑定，请先申请解除后再申报', binding: active });
  }

  const declaredAt = new Date().toISOString();
  const binding: Binding = {
    id: nextId('BD'),
    deviceSn: payload.deviceSn,
    customerId: payload.customerId,
    vendorId: auth.vendorId ?? '',
    type: payload.type,
    source: 'VENDOR_DECLARE',
    effectiveFrom: declaredAt,
    status: 'PENDING_CONFIRM',
    operator: operatorName(),
    autoConfirmed: false,
    declaredAt,
    autoConfirmDeadline: addHours(declaredAt, 24 * 7),
  };
  db.bindings.unshift(binding);
  db.bindingHistory.unshift({
    id: nextId('BH'),
    bindingId: binding.id,
    version: 1,
    action: '创建绑定',
    operator: operatorName(),
    time: declaredAt,
    reason: '厂家申报建立绑定关系',
  });
  return delay({ ok: true, binding });
}

/** 申请解绑 */
export function requestUnbind(bindingId: string, reason: string): Promise<void> {
  if (!reason) return Promise.reject(new Error('解绑原因不能为空'));
  const db = getDb();
  try {
    applyTransition({
      collection: 'bindings',
      id: bindingId,
      to: 'PENDING_RELEASE',
      action: 'requestRelease',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: reason,
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  db.bindingHistory.unshift({
    id: nextId('BH'),
    bindingId,
    version: db.bindingHistory.filter((h) => h.bindingId === bindingId).length + 1,
    action: '申请解绑',
    operator: operatorName(),
    time: new Date().toISOString(),
    reason,
  });
  return delay(undefined);
}

/** 下线归档设备 */
export function archiveDevice(sn: string): Promise<void> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  try {
    scopedMutate(db.devices, 'sn', sn, scope, (d) => {
      d.status = 'INACTIVE';
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(undefined);
}

/* ============================================================
 * 绑定
 * ============================================================ */

/** 绑定列表（厂家视角） */
export function getBindingList(
  q: BindingQuery,
): Promise<PageResult<Binding & { deviceName: string; customerName: string }>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const paged = scopedQuery(db.bindings, scope, {
    keyword: q.keyword,
    searchFields: ['id', 'deviceSn'],
    sortBy: 'effectiveFrom',
    sortOrder: 'desc',
    page: q.page,
    pageSize: q.pageSize,
    filter: (b) => (q.status ? b.status === q.status : true) && (q.type ? b.type === q.type : true),
  });
  return delay({
    list: paged.list.map((b) => ({
      ...b,
      deviceName: db.devices.find((d) => d.sn === b.deviceSn)?.name ?? b.deviceSn,
      customerName: db.tenants.find((t) => t.id === b.customerId)?.shortName ?? b.customerId,
    })),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/** 待客户确认的申报 */
export function getPendingDeclarations(): Promise<Binding[]> {
  const db = getDb();
  return delay(scopedQuery(db.bindings, resolveScope(useAuthStore()), { filter: (b) => b.status === 'PENDING_CONFIRM' }).list);
}

/** 服务范围内客户（申报绑定下拉） */
export function getServiceScopeCustomers(): Promise<Tenant[]> {
  const db = getDb();
  const auth = useAuthStore();
  const vendor = db.tenants.find((t) => t.id === auth.vendorId);
  return delay(db.tenants.filter((t) => (vendor?.serviceScope ?? []).includes(t.id)));
}

/** 全部客户（用于演示「不在服务范围」的拦截） */
export function getAllCustomers(): Promise<Tenant[]> {
  const db = getDb();
  return delay(db.tenants.filter((t) => t.type === 'CUSTOMER'));
}

/** 绑定变更历史 */
export function getBindingHistory(bindingId: string): Promise<import('@/types').BindingHistory[]> {
  const db = getDb();
  return delay(db.bindingHistory.filter((h) => h.bindingId === bindingId));
}

/* ============================================================
 * 设备使用情况
 * ============================================================ */

/** 使用情况 7 指标（设备 / 型号 / 品类维度） */
export function getUsageStats(q: { dimension: 'device' | 'model' | 'category'; sn?: string }): Promise<UsageOverview> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const devices = scopedQuery(db.devices, scope, {}).list;
  const target = devices.filter((d) => (q.sn ? d.sn === q.sn : true));
  const sns = new Set(target.map((d) => d.sn));
  const stats = db.usageStats.filter((u) => sns.has(u.deviceSn));
  const list = stats.length ? stats : [];

  const avg = (fn: (u: typeof list[number]) => number): number =>
    list.length ? Math.round((list.reduce((s, u) => s + fn(u), 0) / list.length) * 10) / 10 : 0;

  const activityDist: ChartSeriesData[] = ['HIGH', 'NORMAL', 'LOW', 'ZOMBIE'].map((level) => ({
    name: { HIGH: '高活跃', NORMAL: '正常活跃', LOW: '低活跃', ZOMBIE: '僵尸设备' }[level] ?? level,
    value: list.filter((u) => u.activityLevel === level).length,
  }));

  const components = db.components.filter((c) => sns.has(c.deviceSn));
  const componentHealth = components.length
    ? Math.round(((components.length - components.filter((c) => c.dataMissingRate > 5).length) / components.length) * 1000) / 10
    : 100;

  void q.dimension;
  return delay({
    onlineRate: avg((u) => u.onlineRate),
    runtimePerDay: avg((u) => u.runtimePerDay),
    startStopFreq: avg((u) => u.startStopFreq),
    alarmFreq: avg((u) => u.alarmFreq),
    mtbf: avg((u) => u.mtbf),
    activityDist,
    componentHealth,
  });
}

/** 使用情况明细行 */
export function getUsageRows(q: { dimension: 'device' | 'model' | 'category'; keyword?: string; page: number; pageSize: number }): Promise<PageResult<import('@/types').UsageStat & { deviceName: string; modelCode: string; category: string }>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const devices = scopedQuery(db.devices, scope, {}).list;
  const paged = scopedQuery(db.usageStats, scope, {
    keyword: q.keyword,
    searchFields: ['deviceSn'],
    sortBy: 'onlineRate',
    sortOrder: 'desc',
    page: q.page,
    pageSize: q.pageSize,
  });
  return delay({
    list: paged.list.map((u) => {
      const d = devices.find((x) => x.sn === u.deviceSn);
      return { ...u, deviceName: d?.name ?? u.deviceSn, modelCode: d?.modelCode ?? '', category: d?.category ?? '' };
    }),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/* ============================================================
 * 告警
 * ============================================================ */

/** 告警列表（厂家视角） */
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
        (q.deviceSn ? a.deviceSn === q.deviceSn : true),
    }),
  );
}

/** 实时告警流 */
export function getRealtimeAlarms(limit = 10): Promise<Alarm[]> {
  const db = getDb();
  const rows = scopedQuery(db.alarms, resolveScope(useAuthStore()), { sortBy: 'triggerTime', sortOrder: 'desc' }).list;
  return delay(rows.slice(0, limit));
}

/** 告警详情（前后 30 分钟曲线 + 关联部件） */
export function getAlarmDetail(id: string): Promise<{
  alarm: Alarm;
  before: DeviceMetricPoint[];
  after: DeviceMetricPoint[];
  component?: Component;
  timeline: TimelineRecord[];
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const alarm = scopedFind(db.alarms, 'id', id, scope);
  if (!alarm) return Promise.reject(new Error('告警不存在或不在当前数据范围内'));

  const points = db.deviceMetrics.filter((m) => m.deviceSn === alarm.deviceSn).slice(-120);
  const t = new Date(alarm.triggerTime).getTime();
  const before = points.filter((m) => new Date(m.time).getTime() <= t).slice(-30);
  const after = points.filter((m) => new Date(m.time).getTime() > t).slice(0, 30);
  const component = alarm.componentSn ? db.components.find((c) => c.componentSn === alarm.componentSn) : undefined;
  return delay({ alarm, before, after, component, timeline: db.alarmTimelines.filter((x) => x.bizId === id) });
}

/** 告警状态流转 */
export function transitionAlarm(id: string, action: 'confirm' | 'process' | 'recover'): Promise<Alarm> {
  const db = getDb();
  const actionKey = action === 'confirm' ? 'confirmAlarm' : action;
  const targets: Record<string, AlarmStatus> = { confirmAlarm: 'CONFIRMED', process: 'PROCESSING', recover: 'RECOVERED' };
  try {
    applyTransition({
      collection: 'alarms',
      id,
      to: targets[actionKey]!,
      action: actionKey,
      operator: operatorName(),
      operatorRole: operatorRole(),
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(scopedFind(db.alarms, 'id', id, resolveScope(useAuthStore()))!);
}

/** 告警转工单 */
export function createWorkOrderFromAlarm(payload: {
  alarmId: string;
  problemType: WorkOrder['problemType'];
  description: string;
  priority: Priority;
}): Promise<WorkOrder> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const alarm = scopedFind(db.alarms, 'id', payload.alarmId, scope);
  if (!alarm) return Promise.reject(new Error('告警不存在或不在当前数据范围内'));

  const sla = slaOf(payload.priority);
  const now = new Date().toISOString();
  const order: WorkOrder = {
    code: `WO-2026-${String(db.workOrders.length + 1).padStart(4, '0')}`,
    source: 'ALARM_TRANSFER',
    deviceSn: alarm.deviceSn,
    alarmId: alarm.id,
    vendorId: alarm.vendorId,
    customerId: alarm.customerId,
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
  };
  db.workOrders.unshift(order);
  alarm.orderId = order.code;
  // 新建工单直接落在 PENDING_ACCEPT，不经状态机迁移（无 from → to 边），只追加创建时间轴
  appendTimeline('workOrders', order.code, 'create', operatorName(), payload.description, operatorRole());
  return delay(order);
}

/** 告警统计（多维度） */
export function getAlarmStats(q: { granularity: 'day' | 'week' | 'month'; dimension: string }): Promise<Record<string, ChartSeriesData[]>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const alarms = scopedQuery(db.alarms, scope, {}).list;

  const byType: ChartSeriesData[] = ['紧急', '重要', '一般'].map((name, i) => ({
    name,
    value: alarms.filter((a) => a.level === ['URGENT', 'IMPORTANT', 'NORMAL'][i]).length,
  }));
  const bySource: ChartSeriesData[] = [
    { name: '厂家规则', value: alarms.filter((a) => a.source === 'VENDOR_RULE').length },
    { name: '平台规则', value: alarms.filter((a) => a.source === 'PLATFORM_RULE').length },
    { name: '客户阈值', value: alarms.filter((a) => a.source === 'CUSTOMER_RULE').length },
  ];
  const byStatus: ChartSeriesData[] = [
    { name: '未确认', value: alarms.filter((a) => a.status === 'UNCONFIRMED').length },
    { name: '已确认', value: alarms.filter((a) => a.status === 'CONFIRMED').length },
    { name: '处理中', value: alarms.filter((a) => a.status === 'PROCESSING').length },
    { name: '已恢复', value: alarms.filter((a) => a.status === 'RECOVERED').length },
  ];
  void q;
  return delay({ byType, bySource, byStatus });
}

/* ============================================================
 * 工单
 * ============================================================ */

/** 工单列表（厂家视角，含设备名与客户名） */
export function getWorkOrderList(
  q: WorkOrderQuery,
): Promise<PageResult<WorkOrder & { deviceName: string; customerName: string }>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const paged = scopedQuery(db.workOrders, scope, {
    keyword: q.keyword,
    searchFields: ['code', 'deviceSn', 'description'],
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: q.page,
    pageSize: q.pageSize,
    filter: (o) =>
      (q.status ? o.status === q.status : true) &&
      (q.priority ? o.priority === q.priority : true) &&
      (q.slaTimeout === undefined ? true : q.slaTimeout ? o.escalationLevel >= 1 : o.escalationLevel === 0),
  });
  return delay({
    list: paged.list.map((o) => ({
      ...o,
      deviceName: db.devices.find((d) => d.sn === o.deviceSn)?.name ?? o.deviceSn,
      customerName: db.tenants.find((t) => t.id === o.customerId)?.shortName ?? o.customerId,
    })),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/** 工单详情 */
export function getWorkOrderDetail(code: string): Promise<{
  order: WorkOrder;
  timeline: TimelineRecord[];
  device: Device;
  deviceAlarms: Alarm[];
  progress: ProgressRecord[];
  spareParts: SparePart[];
}> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const order = scopedFind(db.workOrders, 'code', code, scope);
  if (!order) return Promise.reject(new Error('工单不存在或不在当前数据范围内'));
  const device = db.devices.find((d) => d.sn === order.deviceSn);
  if (!device) return Promise.reject(new Error('工单关联设备不存在'));
  return delay({
    order,
    timeline: db.workOrderTimelines.filter((t) => t.bizId === code),
    device,
    deviceAlarms: scopedQuery(db.alarms, scope, { filter: (a) => a.deviceSn === order.deviceSn }).list.slice(0, 10),
    progress: db.workOrderProgress.filter((p) => p.orderCode === code),
    spareParts: db.spareParts.filter((s) => s.orderCode === code),
  });
}

/** 接单（必填接单说明 + 预计到场时间） */
export function acceptWorkOrder(code: string, payload: { remark: string; etaAt: string }): Promise<WorkOrder> {
  if (!payload.remark) return Promise.reject(new Error('接单说明不能为空'));
  if (!payload.etaAt) return Promise.reject(new Error('预计到场时间不能为空'));
  const db = getDb();
  try {
    applyTransition({
      collection: 'workOrders',
      id: code,
      to: 'IN_PROGRESS',
      action: 'accept',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: payload.remark,
      patch: { acceptRemark: payload.remark, etaAt: payload.etaAt },
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  return delay(db.workOrders.find((o) => o.code === code)!);
}

/** 更新进展（可多次，不改变主状态） */
export function addProgress(code: string, payload: { content: string; attachments: Attachment[] }): Promise<WorkOrder> {
  if (!payload.content) return Promise.reject(new Error('进展内容不能为空'));
  const db = getDb();
  db.workOrderProgress.unshift({
    id: nextId('PR'),
    orderCode: code,
    content: payload.content,
    operator: operatorName(),
    time: new Date().toISOString(),
    attachments: payload.attachments,
  });
  appendTimeline('workOrders', code, 'addProgress', operatorName(), payload.content, operatorRole());
  return delay(db.workOrders.find((o) => o.code === code)!);
}

/** 反馈处理结果（必填处理过程说明 + 备件登记 + 现场照片） */
export function submitFeedback(
  code: string,
  payload: { content: string; spareParts: SparePart[]; attachments: Attachment[] },
): Promise<WorkOrder> {
  if (!payload.content) return Promise.reject(new Error('处理过程说明不能为空'));
  const db = getDb();
  try {
    applyTransition({
      collection: 'workOrders',
      id: code,
      to: 'PENDING_CONFIRM',
      action: 'submitFeedback',
      operator: operatorName(),
      operatorRole: operatorRole(),
      remark: payload.content,
      patch: { attachments: payload.attachments },
    });
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  payload.spareParts.forEach((sp) => {
    db.spareParts.unshift({ ...sp, id: nextId('SP'), orderCode: code, createdAt: new Date().toISOString() });
  });
  return delay(db.workOrders.find((o) => o.code === code)!);
}

/* ============================================================
 * 部件 / 账号 / 履约画像
 * ============================================================ */

/** 部件台账 */
export function getComponentList(q: { page: number; pageSize: number; keyword?: string; type?: string }): Promise<PageResult<Component & { deviceName: string }>> {
  const db = getDb();
  const scope = resolveScope(useAuthStore());
  const paged = scopedQuery(db.components, scope, {
    keyword: q.keyword,
    searchFields: ['componentSn', 'deviceSn', 'batch'],
    sortBy: 'componentSn',
    sortOrder: 'asc',
    page: q.page,
    pageSize: q.pageSize,
    filter: (c) => (q.type ? c.type === q.type : true),
  });
  return delay({
    list: paged.list.map((c) => ({ ...c, deviceName: db.devices.find((d) => d.sn === c.deviceSn)?.name ?? c.deviceSn })),
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  });
}

/** 保存部件 */
export function saveComponent(payload: Partial<Component>): Promise<Component> {
  const db = getDb();
  const hit = payload.id ? db.components.find((c) => c.id === payload.id) : undefined;
  if (hit) {
    Object.assign(hit, payload);
    return delay(hit);
  }
  const created: Component = {
    id: payload.id ?? nextId('CMP'),
    componentSn: payload.componentSn ?? 'CMP-NEW',
    type: payload.type ?? 'TEMP_SENSOR',
    firmwareVersion: payload.firmwareVersion ?? 'v1.0.0',
    metricSet: payload.metricSet ?? ['temperature'],
    deviceSn: payload.deviceSn ?? '',
    vendorId: selfVendorId(),
    batch: payload.batch ?? 'B001',
    dataMissingRate: payload.dataMissingRate ?? 0,
  };
  db.components.unshift(created);
  return delay(created);
}

/** 子账号列表 */
export function getAccountList(): Promise<TenantAccount[]> {
  const db = getDb();
  const auth = useAuthStore();
  return delay(db.tenantAccounts.filter((a) => a.tenantId === auth.tenantId));
}

/** 邀请子账号 */
export function inviteAccount(payload: Partial<TenantAccount>): Promise<TenantAccount> {
  const db = getDb();
  const auth = useAuthStore();
  const account: TenantAccount = {
    id: nextId('ACC'),
    tenantId: auth.tenantId ?? '',
    name: payload.name ?? '新账号',
    account: payload.account ?? `user${db.tenantAccounts.length + 1}`,
    role: payload.role ?? 'VENDOR_VIEWER',
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

/** 履约画像 */
export function getPerformance(quarter: string): Promise<VendorSlaStat | null> {
  const db = getDb();
  const stat = db.vendorSlaStats.find((s) => s.vendorId === selfVendorId() && s.quarter === quarter);
  return delay(stat ?? null);
}

/** 履约季度列表 */
export function getPerformanceQuarters(): Promise<string[]> {
  return delay(Array.from(new Set(getDb().vendorSlaStats.map((s) => s.quarter))));
}

/** 通知中心（厂家） */
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

/** 客户阈值（厂家不可写，仅查看由自己触发的规则数） */
export function getTriggeredThresholdCount(): Promise<number> {
  const db = getDb();
  return delay(scopedQuery(db.customerThresholds, resolveScope(useAuthStore()), { filter: (t) => t.enabled }).total);
}

export type { CustomerThreshold };

/** 厂家端 API 对象 */
export const vendorApi = {
  getDashboard,
  getMyOnboarding,
  saveOnboardingDraft,
  submitOnboarding,
  resubmitRectify,
  restartOnboarding,
  getOnboardingTimeline,
  getTrialNotice,
  getModelList,
  saveModel,
  toggleModel,
  getOwnedModels,
  getDeviceList,
  getDeviceDetail,
  createDevice,
  updateDevice,
  batchImportDevices,
  declareBinding,
  requestUnbind,
  archiveDevice,
  getBindingList,
  getPendingDeclarations,
  getServiceScopeCustomers,
  getAllCustomers,
  getBindingHistory,
  getUsageStats,
  getUsageRows,
  getAlarmList,
  getRealtimeAlarms,
  getAlarmDetail,
  transitionAlarm,
  createWorkOrderFromAlarm,
  getAlarmStats,
  getWorkOrderList,
  getWorkOrderDetail,
  acceptWorkOrder,
  addProgress,
  submitFeedback,
  getComponentList,
  saveComponent,
  getAccountList,
  inviteAccount,
  approveAccount,
  getPerformance,
  getPerformanceQuarters,
  getNotificationList,
  getTriggeredThresholdCount,
};