/**
 * ★ mock 数据层验收脚本 —— `npm run verify:mock`
 *
 * 覆盖架构文档 T05 的 10 条验收断言 + T13 的路由/状态机/菜单一致性检查。
 * 这个脚本是回归护栏：改了 scope/query/stateMachine/factories 任一处，
 * 跑一遍就知道有没有破坏隔离或状态覆盖。
 */
import {
  canTransition,
  WORK_ORDER_MACHINE,
  ONBOARDING_MACHINE,
  ALARM_MACHINE,
  BINDING_MACHINE,
  STATUS_LABEL,
  TONE_MAP,
  MENUS,
  DEMO_ACCOUNTS,
} from '@/constants';
import { calcSlaRatio } from '@/constants/sla';
import { toneOf } from '@/constants/statusMap';

import { applyTransition, getDb, resetDb } from './db';
import { resolveScope } from './scope';
import { scopedFind, scopedQuery } from './query';

import type { AuthStoreLike } from '@/store/types';

/** 断言计数 */
let passed = 0;
let failed = 0;

/**
 * 断言
 * @param condition 条件
 * @param desc 描述
 */
function assert(condition: boolean, desc: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${desc}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${desc}`);
  }
}

/** 分节标题 */
function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

function authOf(
  role: 'PLATFORM' | 'VENDOR' | 'CUSTOMER',
  tenantId: string | null,
  vendorId: string | null,
  vendorType: 'COOKWARE' | 'IOT' | null = null,
): AuthStoreLike {
  return { role, tenantId, vendorId, vendorType };
}

const PLATFORM = authOf('PLATFORM', 'PLATFORM', null);
const COOKWARE = authOf('VENDOR', 'TEN-0001', 'TEN-0001', 'COOKWARE');
const CUSTOMER_A = authOf('CUSTOMER', 'TEN-0005', null);

/* ============================================================
 * 1. 集合条数
 * ============================================================ */
section('1. 集合条数');
const db = getDb();
assert(db.tenants.length === 24, `tenants = 24（实际 ${db.tenants.length}）`);
assert(db.tenantAccounts.length === 60, `tenantAccounts = 60（实际 ${db.tenantAccounts.length}）`);
assert(db.onboardingApplications.length === 9, `onboardingApplications = 9（实际 ${db.onboardingApplications.length}）`);
assert(db.productModels.length === 14, `productModels = 14（实际 ${db.productModels.length}）`);
assert(db.devices.length === 86, `devices = 86（实际 ${db.devices.length}）`);
assert(db.components.length >= 60, `components ≥ 60（实际 ${db.components.length}）`);
assert(db.bindings.length === 120, `bindings = 120（实际 ${db.bindings.length}）`);
assert(db.alarms.length === 140, `alarms = 140（实际 ${db.alarms.length}）`);
assert(db.workOrders.length === 67, `workOrders = 67（F3 后 +3，实际 ${db.workOrders.length}）`);
assert(db.spareParts.length >= 40, `spareParts ≥ 40（实际 ${db.spareParts.length}）`);
assert(db.notifications.length === 30, `notifications = 30（实际 ${db.notifications.length}）`);
assert(db.auditLogs.length === 60, `auditLogs = 60（实际 ${db.auditLogs.length}）`);
assert(db.alarmRules.length === 18, `alarmRules = 18（实际 ${db.alarmRules.length}）`);
assert(db.disputes.length === 6, `disputes = 6（实际 ${db.disputes.length}）`);
assert(db.vendorSlaStats.length === 16, `vendorSlaStats = 16（实际 ${db.vendorSlaStats.length}）`);
assert(db.usageStats.length === 86, `usageStats = 86（实际 ${db.usageStats.length}）`);
assert(db.customerThresholds.length === 24, `customerThresholds = 24（实际 ${db.customerThresholds.length}）`);
assert(
  db.deviceMetrics.length >= 4000 && db.deviceMetrics.length <= 14000,
  `deviceMetrics ∈ [4000, 14000]（实际 ${db.deviceMetrics.length}）`,
);

/* ============================================================
 * 2. 状态全覆盖
 * ============================================================ */
section('2. 状态全覆盖');
const onboardingStates = new Set(db.onboardingApplications.map((a) => a.status));
['DRAFT', 'PENDING_PRIMARY', 'PENDING_SECONDARY', 'RECTIFY', 'REJECTED', 'TRIAL', 'ACTIVE'].forEach((s) => {
  assert(onboardingStates.has(s as never), `入驻 7 态覆盖 ${s}`);
});

const orderStates = new Map<string, number>();
db.workOrders.forEach((o) => orderStates.set(o.status, (orderStates.get(o.status) ?? 0) + 1));
['PENDING_ACCEPT', 'IN_PROGRESS', 'PENDING_CONFIRM', 'COMPLETED', 'CLOSED'].forEach((s) => {
  assert((orderStates.get(s) ?? 0) >= 8, `工单态 ${s} ≥ 8（实际 ${orderStates.get(s) ?? 0}）`);
});

const alarmStates = new Map<string, number>();
db.alarms.forEach((a) => alarmStates.set(a.status, (alarmStates.get(a.status) ?? 0) + 1));
['UNCONFIRMED', 'CONFIRMED', 'PROCESSING', 'RECOVERED'].forEach((s) => {
  assert((alarmStates.get(s) ?? 0) >= 15, `告警态 ${s} ≥ 15（实际 ${alarmStates.get(s) ?? 0}）`);
});

/* ============================================================
 * 3. 故事线定点
 * ============================================================ */
section('3. 预设故事线定点');
const app = (id: string) => db.onboardingApplications.find((a) => a.id === id);
assert(app('ONB-2026-0001')?.status === 'PENDING_PRIMARY', 'ONB-2026-0001 = PENDING_PRIMARY');
assert(app('ONB-2026-0003')?.status === 'RECTIFY' && Boolean(app('ONB-2026-0003')?.rectifyReason), 'ONB-2026-0003 = RECTIFY + 有整改原因');
assert(app('ONB-2026-0005')?.status === 'REJECTED', 'ONB-2026-0005 = REJECTED');
assert(app('ONB-2026-0007')?.status === 'TRIAL', 'ONB-2026-0007 = TRIAL');

const unboundDev = db.devices.find((d) => d.sn === 'CK-XA-2026-0001');
const unboundBindings = db.bindings.filter((b) => b.deviceSn === 'CK-XA-2026-0001' && b.status === 'ACTIVE' && b.type === 'OWNERSHIP');
assert(Boolean(unboundDev) && unboundBindings.length === 0, 'B 线：CK-XA-2026-0001 无生效产权绑定');

// B 线待确认绑定以「故事锚点 id」定位，不硬编码设备 SN
// （SN 曾硬编码为 CK-XA-2026-0007，而该设备不存在 → BD-9001 成悬空绑定，
//   客户确认后资产视图里不会出现任何设备，断点二链路实际是断的）
const pendingBind = db.bindings.find((b) => b.id === 'BD-9001');
const bindSn = pendingBind?.deviceSn ?? '';
assert(pendingBind?.status === 'PENDING_CONFIRM', 'B 线：BD-9001 存在 PENDING_CONFIRM 绑定');
assert(pendingBind?.customerId === 'TEN-0005', 'B 线：BD-9001 申报给 TEN-0005');
assert(
  Boolean(bindSn) && db.devices.some((d) => d.sn === bindSn),
  `B 线：BD-9001 关联的设备真实存在（${bindSn || 'N/A'}）—— 否则客户确认后资产视图无设备`,
);
const declaredDays = pendingBind?.declaredAt ? (Date.now() - new Date(pendingBind.declaredAt).getTime()) / 86_400_000 : -1;
assert(declaredDays >= 2.9 && declaredDays <= 3.1, `B 线：申报时间为 3 天前（实际 ${declaredDays.toFixed(2)} 天）`);

// 断点二链路可验证性：确认前不可见 → 确认后可见（否则「确认绑定」点了个寂寞）
assert(
  Boolean(bindSn) && !resolveScope(CUSTOMER_A).visibleDeviceSns?.has(bindSn),
  `B 线：确认前 ${bindSn} 对 TEN-0005 不可见`,
);
// 待确认绑定必须能通过 api 层查到：scopedQuery 默认走「设备维度」隔离，
// 而待确认绑定的设备按定义还不可见 —— 曾因此让绑定确认页恒为空（断链二断在数据层）。
const pendingViaApi = scopedQuery(db.bindings, resolveScope(CUSTOMER_A), {
  skipDeviceScope: true,
  filter: (b) => b.status === 'PENDING_CONFIRM',
}).list;
assert(
  pendingViaApi.some((b) => b.id === 'BD-9001'),
  `B 线：api 层能查到待确认绑定（skipDeviceScope，实际 ${pendingViaApi.length} 条）`,
);
if (pendingBind) {
  // 记录基线，测完原地还原（不用 resetDb：那会让 resolveScope 改读新库，反而污染后续断言）
  const timelinesBefore = db.bindingTimelines.length;
  applyTransition({
    collection: 'bindings',
    id: 'BD-9001',
    to: 'ACTIVE',
    action: 'confirmBinding',
    operator: '福州一中管理员',
    operatorRole: 'CUSTOMER_ADMIN',
    remark: '',
  });
  assert(
    resolveScope(CUSTOMER_A).visibleDeviceSns?.has(bindSn) === true,
    `B 线：客户确认后 ${bindSn} 进入 TEN-0005 资产视图`,
  );
  assert(
    db.bindings.find((b) => b.id === 'BD-9001')?.status === 'ACTIVE',
    'B 线：确认后 BD-9001 = ACTIVE',
  );
  // 还原：状态回到待确认，并撤掉本次追加的时间轴记录
  pendingBind.status = 'PENDING_CONFIRM';
  db.bindingTimelines.length = timelinesBefore;
}

const storyAlarm = db.alarms.find((a) => a.id === 'ALM-2026-0088');
const coldSn = db.devices.find((d) => d.modelCode === 'CK-RF-2026')?.sn;
assert(
  Boolean(coldSn) && storyAlarm?.level === 'URGENT' && storyAlarm.deviceSn === coldSn,
  `C 线：ALM-2026-0088 紧急 + 3 号冷柜（${coldSn}）`,
);
assert(
  Boolean(coldSn) && db.devices.some((d) => d.sn === storyAlarm?.deviceSn),
  'C 线：故事线告警关联的设备真实存在（否则工单详情会报「工单关联设备不存在」）',
);
assert(Boolean(storyAlarm?.componentSn), 'C 线：ALM-2026-0088 关联部件');

const order = (code: string) => db.workOrders.find((o) => o.code === code);
assert(order('WO-2026-0031')?.status === 'PENDING_ACCEPT', 'C 线：WO-2026-0031 = PENDING_ACCEPT');
assert(order('WO-2026-0031')?.alarmId === 'ALM-2026-0088', 'C 线：WO-2026-0031 关联 ALM-2026-0088');
assert(order('WO-2026-0025')?.status === 'IN_PROGRESS', 'C 线：WO-2026-0025 = IN_PROGRESS');
assert(
  db.workOrderProgress.filter((p) => p.orderCode === 'WO-2026-0025').length === 2,
  'C 线：WO-2026-0025 有 2 条进展',
);
assert(
  db.spareParts.filter((s) => s.orderCode === 'WO-2026-0025').length === 1,
  'C 线：WO-2026-0025 有 1 条备件',
);
assert(order('WO-2026-0018')?.status === 'PENDING_CONFIRM', 'C 线：WO-2026-0018 = PENDING_CONFIRM');
assert(
  db.spareParts.filter((s) => s.orderCode === 'WO-2026-0018').length >= 1,
  'C 线：WO-2026-0018 有备件记录',
);
assert(order('WO-2026-0009')?.status === 'COMPLETED', 'C 线：WO-2026-0009 = COMPLETED');
const oldDays = order('WO-2026-0009')?.completedAt
  ? (Date.now() - new Date(order('WO-2026-0009')!.completedAt!).getTime()) / 86_400_000
  : -1;
assert(oldDays > 7, `C 线：WO-2026-0009 完成距今 > 7 天（实际 ${oldDays.toFixed(1)} 天）`);

// 故事线工单必须落在厂家可见范围内，否则工单闭环链路易断（scopedFind 会判不可见）
const storyOrders = ['WO-2026-0031', 'WO-2026-0025', 'WO-2026-0018', 'WO-2026-0009'];
const cookwareScope2 = resolveScope(COOKWARE);
const invisibleOrders = storyOrders.filter(
  (code) => scopedFind(db.workOrders, 'code', code, cookwareScope2) === null,
);
assert(
  invisibleOrders.length === 0,
  `厨具厂家可见全部 4 条故事线工单（不可见 ${invisibleOrders.length} 条：${invisibleOrders.join(',') || '无'}）`,
);
assert(
  scopedFind(db.alarms, 'id', 'ALM-2026-0088', cookwareScope2) !== null,
  '厨具厂家可见故事线紧急告警 ALM-2026-0088',
);

/* ============================================================
 * 4. 数据隔离（核心）
 * ============================================================ */
section('4. 数据隔离');
const platformScope = resolveScope(PLATFORM);
assert(platformScope.visibleDeviceSns === null, '平台方 visibleDeviceSns = null（不限）');
assert(scopedQuery(db.devices, platformScope, {}).total === 86, '平台方可见 86 台设备');

const cookwareScope = resolveScope(COOKWARE);
const cookwareDevices = scopedQuery(db.devices, cookwareScope, {});
assert(cookwareDevices.total > 0 && cookwareDevices.total < 86, `厨具厂家可见 0 < n < 86（实际 ${cookwareDevices.total}）`);

const customerScope = resolveScope(CUSTOMER_A);
const customerDevices = scopedQuery(db.devices, customerScope, {});
assert(
  customerDevices.list.every((d) => d.ownerCustomerId === 'TEN-0005'),
  `客户 A 可见设备全部归属 TEN-0005（实际 ${customerDevices.total} 台）`,
);
assert(customerDevices.total < 86, `客户 A 可见设备 < 86（实际 ${customerDevices.total}）`);

// 越权防护
const outsideSn = db.devices.find((d) => !customerScope.visibleDeviceSns?.has(d.sn))?.sn;
assert(
  Boolean(outsideSn) && scopedFind(db.devices, 'sn', outsideSn, customerScope) === null,
  `越权访问返回 null（探测 SN：${outsideSn ?? 'N/A'}）`,
);

// ── F3：福州第一中学食堂（TEN-0005）扩到 8~15 设备 + 3~5 工单（含 1 张待验收）──
const schoolDevices = scopedQuery(db.devices, customerScope, {});
assert(
  schoolDevices.total >= 8 && schoolDevices.total <= 15,
  `F3：TEN-0005 可见设备数 ∈ [8,15]（实际 ${schoolDevices.total} 台）`,
);
const schoolOrders = db.workOrders.filter((o) => o.customerId === 'TEN-0005');
assert(
  schoolOrders.length >= 3 && schoolOrders.length <= 5,
  `F3：TEN-0005 工单数 ∈ [3,5]（实际 ${schoolOrders.length} 张）`,
);
assert(
  schoolOrders.some((o) => o.status === 'PENDING_CONFIRM'),
  `F3：TEN-0005 至少 1 张待验收工单（验收主链路可达）`,
);

// ── 数据不变量：工单必须落在「申报客户名下」的设备上 ──
// 客户 scope 按设备可见性过滤工单，若 customerId 与设备归属不一致，
// 别人的工单会泄漏进本客户的列表（曾实测 TEN-0005 看到 7 张，其中 3 张属 TEN-0010）。
const mismatchedOrders = db.workOrders.filter((o) => {
  const dev = db.devices.find((d) => d.sn === o.deviceSn);
  return Boolean(dev?.ownerCustomerId) && dev!.ownerCustomerId !== o.customerId;
});
assert(
  mismatchedOrders.length === 0,
  `不变量：工单 customerId 与设备归属一致（不一致 ${mismatchedOrders.length} 张：${mismatchedOrders.map((o) => o.code).join(',') || '无'}）`,
);

// ── 数据不变量：告警转单的告警必须与工单同设备 ──
const alarmOrderMismatch = db.workOrders.filter((o) => {
  if (!o.alarmId) return false;
  const alarm = db.alarms.find((a) => a.id === o.alarmId);
  return alarm ? alarm.deviceSn !== o.deviceSn : true;
});
assert(
  alarmOrderMismatch.length === 0,
  `不变量：告警转单的告警与工单同设备（错位 ${alarmOrderMismatch.length} 张）`,
);

// ── 数据不变量：工单 / 告警 / 绑定引用的设备必须真实存在 ──
// 硬编码 SN 曾让 3 张 C 线工单指向不存在的设备，详情页直接报「工单关联设备不存在」，
// 且 alignOrderScope 还会据此造出指向空气的产权绑定。
const snSet = new Set(db.devices.map((d) => d.sn));
const orphanOrders = db.workOrders.filter((o) => !snSet.has(o.deviceSn));
assert(
  orphanOrders.length === 0,
  `不变量：工单关联设备真实存在（悬空 ${orphanOrders.length} 张：${orphanOrders.map((o) => `${o.code}->${o.deviceSn}`).join(',') || '无'}）`,
);
const orphanBindings = db.bindings.filter((b) => !snSet.has(b.deviceSn));
assert(
  orphanBindings.length === 0,
  `不变量：绑定关联设备真实存在（悬空 ${orphanBindings.length} 条：${orphanBindings.map((b) => `${b.id}->${b.deviceSn}`).join(',') || '无'}）`,
);
const orphanAlarms = db.alarms.filter((a) => !snSet.has(a.deviceSn));
assert(
  orphanAlarms.length === 0,
  `不变量：告警关联设备真实存在（悬空 ${orphanAlarms.length} 条）`,
);

// 交叉不可见（厂家间客户隔离 / scope 派生正确性）：
// 任一厂家可见的客户集合必须完全由「自身 ACTIVE 绑定」派生，不得混入未与其建立绑定的客户。
// （说明：厨具/物联网厂家的服务范围本身可重叠——同一客户可同时被两类厂家服务，属正常业务；
//   真正的隔离保证是「客户可见性由绑定派生」，故以此校验，而非假设两厂家客户互斥。）
const cookwareServed = new Set(
  db.bindings.filter((b) => b.vendorId === 'TEN-0001' && b.status === 'ACTIVE').map((b) => b.customerId),
);
const cookwareVisible = cookwareScope.visibleCustomerIds ?? new Set<string>();
const leakedCustomers = Array.from(cookwareVisible).filter((cid) => !cookwareServed.has(cid));
assert(
  leakedCustomers.length === 0,
  `交叉不可见：厨具厂家可见客户完全由自身 ACTIVE 绑定派生（泄漏 ${leakedCustomers.length} 个）`,
);
const iotServed = new Set(
  db.bindings.filter((b) => b.vendorId === 'TEN-0002' && b.status === 'ACTIVE').map((b) => b.customerId),
);
const iotScope = resolveScope(authOf('VENDOR', 'TEN-0002', 'TEN-0002', 'IOT'));
const iotLeaked = Array.from(iotScope.visibleCustomerIds ?? new Set<string>()).filter((cid) => !iotServed.has(cid));
assert(
  iotLeaked.length === 0,
  `交叉不可见：物联网厂家可见客户完全由自身 ACTIVE 绑定派生（泄漏 ${iotLeaked.length} 个）`,
);

// 字段裁剪
const stripped = scopedQuery(db.devices, customerScope, { stripFields: ['firmwareVersion'] });
assert(
  !('firmwareVersion' in (stripped.list[0] ?? {})),
  '客户视角结果不含 firmwareVersion 键',
);

// 平台脱敏
const masked = scopedQuery(db.tenants, platformScope, {});
assert(masked.list.every((t) => t.contractNo === '***'), '平台方看租户：contractNo 已脱敏为 ***');

// 厂家设备可见性：每一条都必须含本厂 id
assert(
  cookwareDevices.list.every((d) => (d.vendorIds ?? []).includes('TEN-0001')),
  '厂家设备列表每条都含本厂 id',
);

/* ============================================================
 * 5. 确定性
 * ============================================================ */
section('5. 确定性');
const firstSn = db.devices[0]!.sn;
const firstCode = db.workOrders[0]!.code;
resetDb();
const db2 = getDb();
assert(db2.devices[0]!.sn === firstSn, `两次 initDb devices[0].sn 一致（${firstSn}）`);
assert(db2.workOrders[0]!.code === firstCode, `两次 initDb workOrders[0].code 一致（${firstCode}）`);

/* ============================================================
 * 6. 状态机与 applyTransition
 * ============================================================ */
section('6. 状态机');
assert(canTransition('WORK_ORDER', 'PENDING_ACCEPT', 'COMPLETED') === false, '非法迁移被拒：PENDING_ACCEPT → COMPLETED');
assert(canTransition('WORK_ORDER', 'PENDING_ACCEPT', 'IN_PROGRESS') === true, '合法迁移：PENDING_ACCEPT → IN_PROGRESS');
assert(canTransition('ONBOARDING', 'DRAFT', 'PENDING_PRIMARY') === true, '入驻：DRAFT → PENDING_PRIMARY');
assert(canTransition('ONBOARDING', 'RECTIFY', 'PENDING_SECONDARY') === true, '入驻：RECTIFY → PENDING_SECONDARY');
assert(canTransition('ALARM', 'UNCONFIRMED', 'CONFIRMED') === true, '告警：UNCONFIRMED → CONFIRMED');
assert(canTransition('BINDING', 'PENDING_CONFIRM', 'ACTIVE') === true, '绑定：PENDING_CONFIRM → ACTIVE');
assert(WORK_ORDER_MACHINE.PENDING_ACCEPT.actions.some((a) => a.key === 'accept'), '工单 PENDING_ACCEPT 含 accept 动作');
assert(
  WORK_ORDER_MACHINE.PENDING_ACCEPT.actions.find((a) => a.key === 'cancel')?.confirm?.requireReason === true,
  '工单撤单动作 requireReason = true',
);

section('7. applyTransition');
const dbLive = getDb();
const wo = dbLive.workOrders.find((o) => o.code === 'WO-2026-0031')!;
const timelineBefore = dbLive.workOrderTimelines.filter((t) => t.bizId === wo.code).length;
applyTransition({
  collection: 'workOrders',
  id: 'WO-2026-0031',
  to: 'IN_PROGRESS',
  action: 'accept',
  operator: '验收脚本',
  remark: '接单',
});
const timelineAfter = dbLive.workOrderTimelines.filter((t) => t.bizId === wo.code).length;
assert(wo.status === 'IN_PROGRESS', 'applyTransition 后状态 = IN_PROGRESS');
assert(timelineAfter === timelineBefore + 1, `时间轴 +1（${timelineBefore} → ${timelineAfter}）`);
const lastRecord = dbLive.workOrderTimelines.filter((t) => t.bizId === wo.code).slice(-1)[0];
assert(lastRecord?.action === 'accept', '时间轴最后一条 action = accept');

let illegalRejected = false;
try {
  applyTransition({ collection: 'workOrders', id: 'WO-2026-0031', to: 'CLOSED', action: 'archive', operator: '验收脚本' });
} catch {
  illegalRejected = true;
}
assert(illegalRejected, '非法迁移被 applyTransition 拒绝');
assert(wo.status === 'IN_PROGRESS', '非法迁移后状态未被修改');

/* ============================================================
 * 8. 常量一致性
 * ============================================================ */
section('8. 常量一致性');
assert(Object.keys(STATUS_LABEL).length >= 30, `状态码 ≥ 30（实际 ${Object.keys(STATUS_LABEL).length}）`);
assert(Object.keys(TONE_MAP).length >= 30, `色调映射 ≥ 30（实际 ${Object.keys(TONE_MAP).length}）`);
assert(toneOf('PENDING_ACCEPT') === 'waiting', "toneOf('PENDING_ACCEPT') = waiting");
assert(toneOf('CLOSED') === 'closed', "toneOf('CLOSED') = closed");
assert(toneOf('REJECTED') === 'reject', "toneOf('REJECTED') = reject");

const vendorMenu = MENUS.find((g) => g.role === 'VENDOR')!;
assert(vendorMenu.items.length === 13, `厂家菜单 13 项（实际 ${vendorMenu.items.length}）`);
assert(vendorMenu.items.find((i) => i.path === '/vendor/components')?.vendorType === 'IOT', '/vendor/components 仅物联网厂家');
assert(vendorMenu.items.find((i) => i.path === '/vendor/models')?.vendorType === 'COOKWARE', '/vendor/models 仅厨具厂家');
assert(MENUS.find((g) => g.role === 'PLATFORM')!.items.length === 14, '平台菜单 14 项');
assert(MENUS.find((g) => g.role === 'CUSTOMER')!.items.length === 9, '客户菜单 9 项');
assert(DEMO_ACCOUNTS.length === 13, `演示账号 13 个（实际 ${DEMO_ACCOUNTS.length}）`);
assert(
  new Set(DEMO_ACCOUNTS.map((a) => a.role)).size === 3,
  '演示账号覆盖三类角色',
);
assert(
  DEMO_ACCOUNTS.some((a) => a.onboardingStatus === 'TRIAL') && DEMO_ACCOUNTS.some((a) => a.onboardingStatus === null),
  '演示账号含 TRIAL 与未入驻账号',
);

// 状态机节点 label 必须都在 statusMap 里有 label
const allMachineNodes = [
  ...Object.entries(WORK_ORDER_MACHINE),
  ...Object.entries(ONBOARDING_MACHINE),
  ...Object.entries(ALARM_MACHINE),
  ...Object.entries(BINDING_MACHINE),
];
const missingLabel = allMachineNodes.filter(([status, node]) => !STATUS_LABEL[status] && !node.label);
assert(missingLabel.length === 0, `所有状态机节点都有中文名（缺失 ${missingLabel.length} 个）`);

// 所有演示账号引用的租户都必须存在
const missingTenant = DEMO_ACCOUNTS.filter((a) => a.role !== 'PLATFORM' && !db.tenants.some((t) => t.id === a.tenantId));
assert(missingTenant.length === 0, `演示账号引用的租户均存在（缺失 ${missingTenant.length} 个）`);

/* ============================================================
 * 9. SLA 计算
 * ============================================================ */
section('9. SLA 计算');
const freshOrder = db.workOrders.find((o) => o.status === 'PENDING_ACCEPT')!;
const ratioNow = calcSlaRatio(freshOrder.createdAt, freshOrder.deadlineAt);
assert(Number.isFinite(ratioNow), `SLA 比例可计算（${ratioNow.toFixed(3)}）`);
assert(
  Object.values(TONE_MAP).every((t) =>
    ['waiting', 'trial', 'success', 'processing', 'confirm', 'closed', 'reject', 'info', 'notice'].includes(t),
  ),
  '所有 TONE 值都在 9 组徽标矩阵内',
);

/* ============================================================
 * 结果
 * ============================================================ */
console.log(`\n══════════════════════════════════`);
console.log(`通过 ${passed} 项，失败 ${failed} 项`);
console.log(`══════════════════════════════════`);
if (failed > 0) {
  process.exitCode = 1;
}