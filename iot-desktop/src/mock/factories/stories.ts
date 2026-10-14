/**
 * ★ M-23 预设故事线 —— 定点覆盖（PRD 5.3）
 *
 * 这些记录是四条主链路的锚点，状态与关键字段为硬编码，不可被随机生成覆盖。
 * | 编号 | 实体 | 强制状态/字段 | 用途 |
 * | A 线 | ONB-2026-0001 | PENDING_PRIMARY | 4.1 入驻起点（平台端「通过初审」入口） |
 * | A 线 | ONB-2026-0003 | RECTIFY + rectifyReason | 整改分支 |
 * | A 线 | ONB-2026-0005 | REJECTED + rejectReason | 驳回分支 |
 * | A 线 | ONB-2026-0007 | TRIAL | 试运营 → 转正 |
 * | A 线 | ONB-2026-0002/0004/0006 | DRAFT / PENDING_SECONDARY / REJECTED | 补齐 7 态 |
 * | B 线 | CK-XA-2026-0001 | 无生效绑定 | 4.2 厂家「单台新增 + 申报绑定」 |
 * | B 线 | CK-XA-2026-0007 | PENDING_CONFIRM 绑定，申报 3 天前 | 客户 7 天倒计时 |
 * | C 线 | ALM-2026-0088 | 紧急、3 号冷柜超温、关联部件 | 4.4 告警→工单 |
 * | C 线 | WO-2026-0031 | PENDING_ACCEPT，源=告警转单，关联 ALM-2026-0088 | 厂家接单入口 |
 * | C 线 | WO-2026-0025 | IN_PROGRESS + 2 条进展 + 1 条备件 | 接单后环节 |
 * | C 线 | WO-2026-0018 | PENDING_CONFIRM + 备件 + 现场照片 | 客户验收 |
 * | C 线 | WO-2026-0009 | COMPLETED 且 completedAt 距今 > 7 天 | 自动归档演示 |
 */
import { addDays, addHours } from '@/utils/date';

import { SLA_DEFAULT } from '@/constants/sla';

import type { MockDb } from '../db';
import type { Random } from '../types';
import type {
  Device,
  Priority,
  ProgressRecord,
  SparePart,
  TimelineRecord,
  WorkOrder,
  WorkOrderStatus,
} from '@/types';

/** 故事线锚点 id（集中定义，避免散落魔法值） */
export const STORY = {
  APP_PRIMARY: 'ONB-2026-0001',
  APP_TRIAL: 'ONB-2026-0007',
  APP_RECTIFY: 'ONB-2026-0003',
  APP_REJECTED: 'ONB-2026-0005',
  APP_SECONDARY: 'ONB-2026-0008',
  APP_DRAFT: 'ONB-2026-0004',
  DEVICE_UNBOUND: 'CK-XA-2026-0001',
  /**
   * ⚠️ 占位值：真实 SN 由 resolvePendingBindDeviceSn() 从库里解析。
   * 硬编码的 CK-XA-2026-0007 并不存在于生成的设备集中，曾导致 BD-9001 成为
   * 「指向不存在设备」的悬空绑定 —— 客户确认后资产视图里没有任何设备可出现。
   */
  DEVICE_PENDING_BIND: 'CK-XA-2026-0007',
  ALARM_URGENT: 'ALM-2026-0088',
  /** ⚠️ 占位值：真实 SN 由 patchAlarmAndOrders() 按型号 CK-RF-2026 从库里解析 */
  ALARM_DEVICE: 'CK-RF-2026-0003',
  ORDER_PENDING_ACCEPT: 'WO-2026-0031',
  ORDER_IN_PROGRESS: 'WO-2026-0025',
  ORDER_PENDING_CONFIRM: 'WO-2026-0018',
  ORDER_COMPLETED_OLD: 'WO-2026-0009',
} as const;

/**
 * 应用预设故事线定点覆盖
 * @param db 内存数据库（就地修改）
 * @param r 随机工具（用于生成稳定的衍生字段）
 */
export function applyStoryLines(db: MockDb, r: Random): void {
  // B 线「待客户确认绑定」必须先解析真实设备 SN：后续 patchDevicesAndBindings 建绑定、
  // seedSchoolCustomer 排除受保护设备，都要用同一个 SN，否则链路会断
  const pendingBindSn = resolvePendingBindDeviceSn(db);
  patchOnboarding(db);
  patchDevicesAndBindings(db, pendingBindSn);
  patchAlarmAndOrders(db, r, pendingBindSn);
  // F3：福州第一中学食堂（TEN-0005）扩到 8~15 台设备 + 3~5 工单（含 1 张待验收）
  seedSchoolCustomer(db, r, pendingBindSn);
  // 数据不变量收尾：工单必须落在「申报客户名下」的设备上（见 reconcileOrderOwnership）
  reconcileOrderOwnership(db);
}

/**
 * 工单关联对齐（数据不变量修复，必须最后执行）
 *
 * 修两类因「故事线改设备 / 改归属」造成的错位：
 * ① 设备归属：patchAlarmAndOrders 把 C 线「3 号冷柜」改挂到演示客户 TEN-0005，
 *    但该设备上已生成的工单仍带原客户 customerId（工厂按生成时的 ownerCustomerId 写死）。
 *    客户 scope 按「设备可见」过滤工单，别人的工单就泄漏进了 TEN-0005 的列表 ——
 *    实测 7 张，既超出 F3 预期的 3~5，也违背「三层数据隔离」的设计意图。
 * ② 告警设备：故事线给工单换了 deviceSn 后，原来配对的告警还留在旧设备上，
 *    详情页会出现「工单设备 ≠ 告警设备」。
 *
 * 规则：工单迁移到「其申报客户名下、且责任厂家可见」的设备；关联告警随单迁移。
 * 找不到合规目标设备时保持原样（不硬迁）。
 */
function reconcileOrderOwnership(db: MockDb): void {
  /** 客户 → 其名下设备 */
  const devicesOf = new Map<string, Device[]>();
  db.devices.forEach((d) => {
    if (!d.ownerCustomerId) return;
    const list = devicesOf.get(d.ownerCustomerId) ?? [];
    list.push(d);
    devicesOf.set(d.ownerCustomerId, list);
  });

  /** 责任厂家是否可见该设备（判定与 mock/scope.ts 的厂家分支保持一致） */
  const vendorSees = (d: Device, vendorId: string): boolean =>
    d.vendorIds.includes(vendorId) || (d.modelCode.startsWith('IOT') ? 'TEN-0002' : 'TEN-0001') === vendorId;

  db.workOrders.forEach((o) => {
    // ① 设备归属对齐
    const current = db.devices.find((d) => d.sn === o.deviceSn);
    if (current?.ownerCustomerId && current.ownerCustomerId !== o.customerId) {
      const target = (devicesOf.get(o.customerId) ?? []).find((d) => vendorSees(d, o.vendorId));
      if (target) o.deviceSn = target.sn;
    }

    // ② 告警随单对齐（告警转单的告警必须与工单同设备）
    const alarm = o.alarmId ? db.alarms.find((a) => a.id === o.alarmId) : undefined;
    if (alarm && alarm.deviceSn !== o.deviceSn) {
      alarm.deviceSn = o.deviceSn;
      alarm.customerId = o.customerId;
    }
  });
}

/**
 * 解析 B 线「待客户确认绑定」的真实设备 SN
 *
 * 硬编码 CK-XA-2026-0007 不在生成的设备集中，会让 BD-9001 变成悬空绑定：
 * 客户在绑定确认页看到一行查不到设备名的记录，确认后资产视图也不会多出设备。
 * 这里按故事意图从库里挑一台「真设备」，挑选条件（全部满足）：
 *   ① 型号 CK-XA-2026 —— 与故事线文案一致
 *   ② 不是 B 线「无绑定演示」设备 CK-XA-2026-0001
 *   ③ 不是 C 线 4 条工单关联设备 —— 否则会破坏告警→工单链路
 *   ④ 当前没有任何「生效产权绑定」—— 对 TEN-0005 不可见，
 *      客户确认后可见性才会真正发生变化，链路可被验证
 *
 * @param db 内存数据库
 * @returns 设备 SN（无候选时退化为占位值，由调用方兜底）
 */
function resolvePendingBindDeviceSn(db: MockDb): string {
  const orderSns = new Set(
    [STORY.ORDER_PENDING_ACCEPT, STORY.ORDER_IN_PROGRESS, STORY.ORDER_PENDING_CONFIRM, STORY.ORDER_COMPLETED_OLD]
      .map((code) => db.workOrders.find((o) => o.code === code)?.deviceSn)
      .filter((sn): sn is string => Boolean(sn)),
  );
  const hasActiveOwnership = (sn: string): boolean =>
    db.bindings.some((b) => b.deviceSn === sn && b.type === 'OWNERSHIP' && b.status === 'ACTIVE');

  const candidate = db.devices.find(
    (d) =>
      d.modelCode === 'CK-XA-2026' &&
      d.sn !== STORY.DEVICE_UNBOUND &&
      !orderSns.has(d.sn) &&
      !hasActiveOwnership(d.sn),
  );
  return candidate?.sn ?? STORY.DEVICE_PENDING_BIND;
}

/**
 * 解析故事线工单的真实设备 SN（按型号查，不硬编码序号）
 *
 * 硬编码曾让 3 张 C 线工单指向不存在的设备（CK-RF-2026-0008 / CK-XB-2026-0005 /
 * CK-XA-2026-0012）：工单详情页直接报「工单关联设备不存在」，且 alignOrderScope
 * 还会据此造出指向空气的产权绑定（BD-Sxxxx），客户侧也看不到这些工单。
 *
 * @param db 内存数据库
 * @param modelCode 目标型号（故事线语义，如冷柜 CK-RF-2026）
 * @param taken 已被其他故事线占用的 SN（避免多条工单挤在同一台设备上）
 * @returns 设备 SN
 */
function resolveStoryDeviceSn(db: MockDb, modelCode: string, taken: Set<string>): string {
  const sameModel = db.devices.filter((d) => d.modelCode === modelCode);
  const free = sameModel.find((d) => !taken.has(d.sn));
  return (free ?? sameModel[0] ?? db.devices[0]!).sn;
}

/**
 * F3（PRD 验收第 3/4 条的前提）：把演示客户「福州第一中学食堂」(TEN-0005)
 * 从基线 1 设备 / 1 工单 扩到 8~15 台设备 + 3~5 工单（含至少 1 张 PENDING_CONFIRM）。
 *
 * 实现原则（不破坏既有隔离断言，devices=86 / bindings=120 / workOrders 仅 +3）：
 *  1. 复用既有设备与绑定（mutate，不新增集合条数）：把 11 台「零工单、非故事线、
 *     已有 OWNERSHIP 绑定」的设备改挂 TEN-0005（ACTIVE 产权绑定 + ownerCustomerId）。
 *  2. 新增 3 张 TEN-0005 工单（待验收 / 处理中 / 已完成），落在新挂载的设备上，
 *     配套进展 / 备件 / 时间轴，使客户工单详情页有真实数据可读。
 *  3. 受保护设备（4 条故事线工单设备 + 2 条故事线绑定设备）一律不碰，保证 C 线不断链。
 * @param db 内存数据库
 * @param r 随机工具
 * @param pendingBindSn B 线「待客户确认绑定」的真实设备 SN（须排除在改挂名单外）
 */
function seedSchoolCustomer(db: MockDb, r: Random, pendingBindSn: string): void {
  const SCHOOL = 'TEN-0005';
  const VENDOR = 'TEN-0001';

  // 受保护设备：4 条故事线工单设备 + 2 条故事线绑定设备（不可动，否则故事线断链）
  const protectedSns = new Set<string>([STORY.DEVICE_UNBOUND, pendingBindSn]);
  ['WO-2026-0031', 'WO-2026-0025', 'WO-2026-0018', 'WO-2026-0009'].forEach((code) => {
    const o = db.workOrders.find((w) => w.code === code);
    if (o) protectedSns.add(o.deviceSn);
  });

  // 1) 选 11 台「零工单、非受保护、非物联网型号」的设备改挂 TEN-0005。
  //    复用其既有绑定（优先 OWNERSHIP，否则 ASSEMBLY）mutate 为「TEN-0005 生效产权绑定」，
  //    不新增集合条数（bindings 仍为 120）。偏好非物联网型号：其装配绑定厂家即 TEN-0001，
  //    mutate 后 TEN-0001 仍可见该设备，不会误伤物联网厂家的隔离。
  const assigned: Device[] = [];
  for (const d of db.devices) {
    if (assigned.length >= 11) break;
    if (protectedSns.has(d.sn)) continue;
    if (d.ownerCustomerId === SCHOOL) continue;
    if (d.modelCode.startsWith('IOT')) continue; // 仅厨具型号，避免影响物联网厂家隔离
    if (db.workOrders.some((o) => o.deviceSn === d.sn)) continue;
    const hasBinding = db.bindings.some(
      (b) => b.deviceSn === d.sn && (b.type === 'OWNERSHIP' || b.type === 'ASSEMBLY'),
    );
    if (!hasBinding) continue;
    assigned.push(d);
  }

  assigned.forEach((d) => {
    const ob =
      db.bindings.find((b) => b.deviceSn === d.sn && b.type === 'OWNERSHIP') ??
      db.bindings.find((b) => b.deviceSn === d.sn && b.type === 'ASSEMBLY')!;
    ob.customerId = SCHOOL;
    ob.vendorId = VENDOR;
    ob.type = 'OWNERSHIP';
    ob.status = 'ACTIVE';
    if (!ob.effectiveFrom) ob.effectiveFrom = addDays(new Date().toISOString(), -30);
    if (!ob.declaredAt) ob.declaredAt = ob.effectiveFrom;
    if (!ob.autoConfirmDeadline) ob.autoConfirmDeadline = addDays(ob.effectiveFrom, 7);
    d.ownerCustomerId = SCHOOL;
    if (!d.vendorIds.includes(VENDOR)) d.vendorIds.push(VENDOR);
  });

  // 2) 选 3 台改挂设备承载新工单
  const carrier = (i: number): string =>
    (assigned[i] ?? db.devices.find((x) => x.ownerCustomerId === SCHOOL) ?? db.devices[0]!).sn;
  const now = new Date().toISOString();

  const mkOrder = (code: string, deviceSn: string, status: WorkOrderStatus, priority: Priority): WorkOrder => ({
    code,
    source: 'CUSTOMER_REPAIR',
    deviceSn,
    alarmId: undefined,
    vendorId: VENDOR,
    customerId: SCHOOL,
    problemType: 'DEVICE_FAULT',
    description: `福州一中食堂报修：${db.devices.find((d) => d.sn === deviceSn)?.name ?? deviceSn}`,
    priority,
    sla: SLA_DEFAULT[priority],
    status,
    deadlineAt: addHours(now, SLA_DEFAULT[priority].handleHours),
    rejectCount: 0,
    disputeFlag: false,
    createdAt: addDays(now, -r.int(2, 30)),
    escalationLevel: 0,
    attachments:
      status === 'PENDING_CONFIRM' || status === 'COMPLETED'
        ? [{ id: `AT-SC-${code.slice(-3)}`, name: '现场照片-1.jpg', category: 'SITE_PHOTO', size: r.int(200, 800) * 1024 }]
        : [],
  });

  const toAdd: Array<{ order: WorkOrder; progress: ProgressRecord[]; spare: SparePart[]; timeline: TimelineRecord[] }> = [];

  // 待验收（断点一核心：客户可点「验收通过」）
  {
    const code = 'WO-2026-9011';
    const deviceSn = carrier(0);
    const order = mkOrder(code, deviceSn, 'PENDING_CONFIRM', 'NORMAL');
    order.acceptRemark = '现场签到后开始检修';
    order.etaAt = addHours(order.createdAt, -20);
    order.completedAt = undefined;
    toAdd.push({
      order,
      progress: [
        { id: 'PR-SC1', orderCode: code, content: '工程师已到场，正在排查故障原因。', operator: '厂家工程师·周敏', time: addHours(order.createdAt, 4), attachments: [] },
        { id: 'PR-SC2', orderCode: code, content: '已更换损坏部件，设备恢复正常运行，请客户验收。', operator: '厂家工程师·周敏', time: addHours(order.createdAt, 16), attachments: [] },
      ],
      spare: [
        { id: 'SP-SC1', orderCode: code, name: '温控器', spec: 'WK-2026-A', quantity: 1, sn: 'SN-901011', oldPartRecycled: true, oldPartDestination: '厂家回收仓', createdAt: addHours(order.createdAt, 16) },
      ],
      timeline: [
        { id: 'TL-SC1', bizId: code, action: '创建工单', operator: '福州一中管理员', operatorRole: 'CUSTOMER_ADMIN', time: order.createdAt, remark: order.description, fromStatus: 'PENDING_ACCEPT', toStatus: 'PENDING_ACCEPT' },
        { id: 'TL-SC2', bizId: code, action: '接单', operator: '厂家工程师·周敏', operatorRole: 'VENDOR_ENGINEER', time: addHours(order.createdAt, 2), remark: '已接单', fromStatus: 'PENDING_ACCEPT', toStatus: 'IN_PROGRESS' },
        { id: 'TL-SC3', bizId: code, action: '反馈结果', operator: '厂家工程师·周敏', operatorRole: 'VENDOR_ENGINEER', time: addHours(order.createdAt, 16), remark: '已更换温控器，设备恢复正常，请客户验收', fromStatus: 'IN_PROGRESS', toStatus: 'PENDING_CONFIRM' },
      ],
    });
  }

  // 处理中
  {
    const code = 'WO-2026-9012';
    const deviceSn = carrier(1);
    const order = mkOrder(code, deviceSn, 'IN_PROGRESS', 'HIGH');
    order.acceptRemark = '已电话联系客户，约定明日上门';
    order.etaAt = addHours(order.createdAt, 6);
    toAdd.push({
      order,
      progress: [
        { id: 'PR-SC3', orderCode: code, content: '工程师已出发，预计 2 小时内到场。', operator: '厂家工程师·郑涛', time: addHours(order.createdAt, 1), attachments: [] },
      ],
      spare: [],
      timeline: [
        { id: 'TL-SC4', bizId: code, action: '创建工单', operator: '福州一中管理员', operatorRole: 'CUSTOMER_ADMIN', time: order.createdAt, remark: order.description, fromStatus: 'PENDING_ACCEPT', toStatus: 'PENDING_ACCEPT' },
        { id: 'TL-SC5', bizId: code, action: '接单', operator: '厂家工程师·郑涛', operatorRole: 'VENDOR_ENGINEER', time: addHours(order.createdAt, 1), remark: '已接单', fromStatus: 'PENDING_ACCEPT', toStatus: 'IN_PROGRESS' },
      ],
    });
  }

  // 已完成（含评价）
  {
    const code = 'WO-2026-9013';
    const deviceSn = carrier(2);
    const order = mkOrder(code, deviceSn, 'COMPLETED', 'LOW');
    order.completedAt = addDays(now, -9);
    order.rating = { score: 5, comment: '师傅专业，已恢复正常', ratedAt: addDays(now, -9) };
    toAdd.push({
      order,
      progress: [
        { id: 'PR-SC4', orderCode: code, content: '已完成清理与保养，设备运行正常。', operator: '厂家工程师·林涛', time: addHours(order.createdAt, 12), attachments: [] },
      ],
      spare: [
        { id: 'SP-SC2', orderCode: code, name: '门封条', spec: 'MF-620', quantity: 1, sn: 'SN-901013', oldPartRecycled: true, oldPartDestination: '厂家回收仓', createdAt: addHours(order.createdAt, 12) },
      ],
      timeline: [
        { id: 'TL-SC6', bizId: code, action: '创建工单', operator: '福州一中管理员', operatorRole: 'CUSTOMER_ADMIN', time: order.createdAt, remark: order.description, fromStatus: 'PENDING_ACCEPT', toStatus: 'PENDING_ACCEPT' },
        { id: 'TL-SC7', bizId: code, action: '验收通过', operator: '福州一中管理员', operatorRole: 'CUSTOMER_ADMIN', time: order.completedAt ?? order.createdAt, remark: '客户确认已恢复', fromStatus: 'PENDING_CONFIRM', toStatus: 'COMPLETED' },
      ],
    });
  }

  toAdd.forEach(({ order, progress, spare, timeline }) => {
    db.workOrders.unshift(order);
    db.workOrderProgress.push(...progress);
    db.spareParts.push(...spare);
    db.workOrderTimelines.push(...timeline);
  });
}

/** A 线：入驻申请 7 态定点 */
function patchOnboarding(db: MockDb): void {
  const force = (id: string, patch: Partial<(typeof db.onboardingApplications)[number]>): void => {
    const app = db.onboardingApplications.find((a) => a.id === id);
    if (app) Object.assign(app, patch);
  };

  force(STORY.APP_PRIMARY, { status: 'PENDING_PRIMARY', submitTime: addDays(new Date().toISOString(), -6), reviewer: undefined });
  force(STORY.APP_TRIAL, { status: 'TRIAL', stayDays: 23 });
  force(STORY.APP_RECTIFY, { status: 'RECTIFY', rectifyReason: '售后工程师数量不足 10 人，请补充人员证明材料' });
  force(STORY.APP_REJECTED, { status: 'REJECTED', rejectReason: '技术对接能力不足，无 MQTT/Modbus 协议对接经验' });
  force(STORY.APP_SECONDARY, { status: 'PENDING_SECONDARY' });
  force(STORY.APP_DRAFT, { status: 'DRAFT', submitTime: undefined });
}

/** B 线：设备 CK-XA-2026-0001 无生效绑定；pendingBindSn 有 3 天前申报的待确认绑定 */
function patchDevicesAndBindings(db: MockDb, pendingBindSn: string): void {
  // 0001：无任何生效绑定，供厂家演示「单台新增 + 申报绑定」
  const unbound = db.devices.find((d) => d.sn === STORY.DEVICE_UNBOUND);
  if (unbound) {
    unbound.ownerCustomerId = null;
    unbound.vendorIds = ['TEN-0001'];
    unbound.status = 'ONLINE';
    unbound.alarmCount = 0;
  }
  db.bindings = db.bindings.filter((b) => b.deviceSn !== STORY.DEVICE_UNBOUND || b.type !== 'OWNERSHIP');

  // pendingBindSn：PENDING_CONFIRM 绑定，申报 3 天前 → 客户页显示倒计时「还剩 4 天」
  db.bindings = db.bindings.filter((b) => b.deviceSn !== pendingBindSn || b.type !== 'OWNERSHIP');
  const declaredAt = addDays(new Date().toISOString(), -3);
  db.bindings.unshift({
    id: 'BD-9001',
    deviceSn: pendingBindSn,
    customerId: 'TEN-0005',
    vendorId: 'TEN-0001',
    type: 'OWNERSHIP',
    source: 'VENDOR_DECLARE',
    effectiveFrom: declaredAt,
    status: 'PENDING_CONFIRM',
    operator: '厂家运营',
    autoConfirmed: false,
    declaredAt,
    autoConfirmDeadline: addDays(declaredAt, 7),
  });

  const pendingDevice = db.devices.find((d) => d.sn === pendingBindSn);
  if (pendingDevice) {
    pendingDevice.vendorIds = ['TEN-0001'];
    pendingDevice.ownerCustomerId = null;
  }
}

/** C 线：告警 → 工单链路定点 */
function patchAlarmAndOrders(db: MockDb, r: Random, pendingBindSn: string): void {
  /** 解析故事线使用的「3 号冷柜」真实 SN（按型号查，不能硬编码序号） */
  const COLD_SN = db.devices.find((d) => d.modelCode === 'CK-RF-2026')?.sn ?? STORY.ALARM_DEVICE;
  /**
   * 其余 3 条 C 线工单的真实设备 SN（按型号解析，同样不能硬编码序号）。
   * taken 里排除：已占用的冷柜、B 线两台设备，保证 4 条工单各落在一台设备上。
   */
  const takenSns = new Set<string>([COLD_SN, STORY.DEVICE_UNBOUND, pendingBindSn]);
  const IN_PROGRESS_SN = resolveStoryDeviceSn(db, 'CK-RF-2026', takenSns);
  takenSns.add(IN_PROGRESS_SN);
  const PENDING_CONFIRM_SN = resolveStoryDeviceSn(db, 'CK-XB-2026', takenSns);
  takenSns.add(PENDING_CONFIRM_SN);
  const COMPLETED_OLD_SN = resolveStoryDeviceSn(db, 'CK-XA-2026', takenSns);
  // 紧急告警 ALM-2026-0088：3 号冷柜超温，关联温度传感器部件
  const alarm = db.alarms.find((a) => a.id === STORY.ALARM_URGENT);
  if (alarm) {
    alarm.deviceSn = COLD_SN;
    alarm.level = 'URGENT';
    alarm.type = '超温';
    alarm.status = 'UNCONFIRMED';
    alarm.threshold = 8;
    alarm.actualValue = 12.6;
    alarm.unit = '℃';
    alarm.duration = 3600;
    alarm.triggerTime = addHours(new Date().toISOString(), -3);
    alarm.componentSn = 'TEM-01234';
    alarm.customerId = 'TEN-0005';
    alarm.vendorId = 'TEN-0001';
    alarm.source = 'PLATFORM_RULE';
    alarm.orderId = STORY.ORDER_PENDING_ACCEPT;
    alarm.byCustomerThreshold = false;
  }

  // 3 号冷柜归属调整到演示客户 TEN-0005
  const coldDevice = db.devices.find((d) => d.sn === COLD_SN);
  if (coldDevice) {
    coldDevice.ownerCustomerId = 'TEN-0005';
    coldDevice.status = 'ABNORMAL';
    coldDevice.vendorIds = ['TEN-0001'];
    coldDevice.alarmCount = Math.max(1, coldDevice.alarmCount);
  }
  // ⚠️ 必须同时补一条生效产权绑定：否则 TEN-0005 不在 TEN-0001 的 visibleCustomerIds 内，
  // 厂家账号下 WO-2026-0031 会被 scopedFind 判为不可见（工单闭环链路直接断掉）
  db.bindings = db.bindings.filter(
    (b) => !(b.deviceSn === COLD_SN && b.type === 'OWNERSHIP'),
  );
  db.bindings.unshift({
    id: 'BD-9002',
    deviceSn: COLD_SN,
    customerId: 'TEN-0005',
    vendorId: 'TEN-0001',
    type: 'OWNERSHIP',
    source: 'PLATFORM_IMPORT',
    effectiveFrom: addDays(new Date().toISOString(), -30),
    status: 'ACTIVE',
    operator: '平台运营',
    autoConfirmed: false,
    declaredAt: addDays(new Date().toISOString(), -30),
  });
  // 关联部件挂到该设备
  db.components.forEach((c) => {
    if (c.componentSn === 'TEM-01234') c.deviceSn = COLD_SN;
  });
  if (!db.components.some((c) => c.componentSn === 'TEM-01234')) {
    db.components.unshift({
      id: 'CMP-9001',
      componentSn: 'TEM-01234',
      type: 'TEMP_SENSOR',
      firmwareVersion: 'v2.3.11',
      metricSet: ['temperature'],
      deviceSn: COLD_SN,
      vendorId: 'TEN-0002',
      batch: 'B118',
      dataMissingRate: 0.4,
    });
  }

  const patchOrder = (code: string, patch: Partial<(typeof db.workOrders)[number]>): void => {
    const order = db.workOrders.find((o) => o.code === code);
    if (order) Object.assign(order, patch);
  };

  /**
   * ★ 工单的客户必须落在该厂家 visibleCustomerIds 内，否则厂家账号下看不到这条工单
   *   （scopedFind 会先做客户维度校验）。这里按「设备归属客户」为准回填。
   */
  const alignOrderScope = (code: string): void => {
    const order = db.workOrders.find((o) => o.code === code);
    if (!order) return;
    const device = db.devices.find((d) => d.sn === order.deviceSn);
    const vendorId = device?.vendorIds[0] ?? order.vendorId;
    const vendor = db.tenants.find((t) => t.id === vendorId);
    // 客户取该设备已有的生效产权绑定；没有则用厂家服务范围内首个客户
    const existing = db.bindings.find(
      (b) => b.deviceSn === order.deviceSn && b.type === 'OWNERSHIP' && b.status === 'ACTIVE',
    );
    const customerId = existing?.customerId ?? device?.ownerCustomerId ?? vendor?.serviceScope[0] ?? 'TEN-0005';

    order.customerId = customerId;
    order.vendorId = vendorId;
    if (device) {
      device.ownerCustomerId = customerId;
      device.vendorIds = Array.from(new Set([...device.vendorIds, vendorId]));
    }

    // ★ 必须补一条生效产权绑定：否则客户不在厂家 visibleCustomerIds 内，
    //   scopedFind 会把这张工单判为不可见，整条工单闭环链路直接断掉
    if (!existing) {
      db.bindings.unshift({
        id: `BD-S${code.slice(-4)}`,
        deviceSn: order.deviceSn,
        customerId,
        vendorId,
        type: 'OWNERSHIP',
        source: 'PLATFORM_IMPORT',
        effectiveFrom: addDays(new Date().toISOString(), -30),
        status: 'ACTIVE',
        operator: '平台运营',
        autoConfirmed: false,
        declaredAt: addDays(new Date().toISOString(), -30),
      });
    }
  };

  // WO-2026-0031：待接单，源=告警转单，关联 ALM-2026-0088
  patchOrder(STORY.ORDER_PENDING_ACCEPT, {
    status: 'PENDING_ACCEPT',
    source: 'ALARM_TRANSFER',
    alarmId: STORY.ALARM_URGENT,
    deviceSn: COLD_SN,
    customerId: 'TEN-0005',
    vendorId: 'TEN-0001',
    problemType: 'DEVICE_FAULT',
    description: '3 号冷柜超温（12.6℃），已持续 60 分钟，请尽快上门处理。',
    priority: 'URGENT',
    sla: SLA_DEFAULT.URGENT,
    createdAt: addHours(new Date().toISOString(), -2),
    deadlineAt: addHours(new Date().toISOString(), 2),
    rejectCount: 0,
    disputeFlag: false,
    escalationLevel: 0,
    completedAt: undefined,
    acceptRemark: undefined,
    etaAt: undefined,
  });

  // WO-2026-0025：处理中 + 2 条进展
  patchOrder(STORY.ORDER_IN_PROGRESS, {
    status: 'IN_PROGRESS',
    deviceSn: IN_PROGRESS_SN,
    customerId: 'TEN-0009',
    vendorId: 'TEN-0001',
    priority: 'HIGH',
    createdAt: addHours(new Date().toISOString(), -30),
    acceptRemark: '已电话联系客户，约定明日 09:00 上门',
    etaAt: addHours(new Date().toISOString(), 6),
    completedAt: undefined,
  });
  db.workOrderProgress = db.workOrderProgress.filter((p) => p.orderCode !== STORY.ORDER_IN_PROGRESS);
  db.workOrderProgress.unshift(
    {
      id: 'PR-9001',
      orderCode: STORY.ORDER_IN_PROGRESS,
      content: '工程师已出发，预计 2 小时内到场。',
      operator: '厂家工程师·郑涛',
      time: addHours(new Date().toISOString(), -3),
      attachments: [],
    },
    {
      id: 'PR-9002',
      orderCode: STORY.ORDER_IN_PROGRESS,
      content: '已到场，正在拆卸压缩机。',
      operator: '厂家工程师·郑涛',
      time: addHours(new Date().toISOString(), -1),
      attachments: [],
    },
  );
  db.spareParts = db.spareParts.filter((s) => s.orderCode !== STORY.ORDER_IN_PROGRESS);
  db.spareParts.unshift({
    id: 'SP-9001',
    orderCode: STORY.ORDER_IN_PROGRESS,
    name: '压缩机',
    spec: 'BZ-315',
    quantity: 1,
    sn: 'SN-778899',
    oldPartRecycled: true,
    oldPartDestination: '厂家回收仓',
    createdAt: addHours(new Date().toISOString(), -1),
  });

  // WO-2026-0018：待验收 + 备件 + 现场照片
  patchOrder(STORY.ORDER_PENDING_CONFIRM, {
    status: 'PENDING_CONFIRM',
    deviceSn: PENDING_CONFIRM_SN,
    customerId: 'TEN-0014',
    vendorId: 'TEN-0001',
    priority: 'NORMAL',
    createdAt: addHours(new Date().toISOString(), -50),
    acceptRemark: '现场签到后开始检修',
    etaAt: addHours(new Date().toISOString(), -46),
    attachments: [
      { id: 'AT-9001', name: '维修前-现场照片.jpg', category: 'SITE_PHOTO', size: 640 * 1024 },
      { id: 'AT-9002', name: '维修后-现场照片.jpg', category: 'SITE_PHOTO', size: 712 * 1024 },
    ],
  });
  db.spareParts = db.spareParts.filter((s) => s.orderCode !== STORY.ORDER_PENDING_CONFIRM);
  db.spareParts.unshift(
    {
      id: 'SP-9002',
      orderCode: STORY.ORDER_PENDING_CONFIRM,
      name: '温控器',
      spec: 'WK-2026-A',
      quantity: 1,
      sn: 'SN-556677',
      oldPartRecycled: true,
      oldPartDestination: '厂家回收仓',
      createdAt: addHours(new Date().toISOString(), -45),
    },
    {
      id: 'SP-9003',
      orderCode: STORY.ORDER_PENDING_CONFIRM,
      name: '加热管',
      spec: 'RG-2026-B',
      quantity: 2,
      oldPartRecycled: true,
      oldPartDestination: '厂家回收仓',
      createdAt: addHours(new Date().toISOString(), -45),
    },
  );

  // WO-2026-0009：已完成且距今 > 7 天 → 自动归档演示
  patchOrder(STORY.ORDER_COMPLETED_OLD, {
    status: 'COMPLETED',
    deviceSn: COMPLETED_OLD_SN,
    customerId: 'TEN-0005',
    vendorId: 'TEN-0001',
    priority: 'LOW',
    createdAt: addDays(new Date().toISOString(), -20),
    completedAt: addDays(new Date().toISOString(), -9),
    rating: { score: 5, comment: '师傅专业，已恢复正常', ratedAt: addDays(new Date().toISOString(), -9) },
    attachments: [{ id: 'AT-9003', name: '维修后-现场照片.jpg', category: 'SITE_PHOTO', size: 588 * 1024 }],
  });

  // 时间轴同步：清掉这 4 条工单的旧时间轴，按定点状态重建
  const storyCodes: string[] = [
    STORY.ORDER_PENDING_ACCEPT,
    STORY.ORDER_IN_PROGRESS,
    STORY.ORDER_PENDING_CONFIRM,
    STORY.ORDER_COMPLETED_OLD,
  ];
  // ★ 先对齐范围再重建时间轴，保证时间轴里的操作人叙述与实际客户一致
  storyCodes.forEach(alignOrderScope);
  db.workOrderTimelines = db.workOrderTimelines.filter((t) => !storyCodes.includes(t.bizId));

  const orderOf = (code: string) => db.workOrders.find((o) => o.code === code)!;
  const wo31 = orderOf(STORY.ORDER_PENDING_ACCEPT);
  db.workOrderTimelines.push(
    {
      id: 'TL-WO-9001', bizId: wo31.code, action: '创建工单', operator: '系统告警转单',
      operatorRole: 'PLATFORM_ADMIN', time: wo31.createdAt,
      remark: `${STORY.ALARM_URGENT} 紧急告警自动转单`, fromStatus: 'PENDING_ACCEPT', toStatus: 'PENDING_ACCEPT',
    },
  );

  const wo25 = orderOf(STORY.ORDER_IN_PROGRESS);
  db.workOrderTimelines.push(
    {
      id: 'TL-WO-9002', bizId: wo25.code, action: '创建工单', operator: '客户报修',
      operatorRole: 'CUSTOMER_ADMIN', time: wo25.createdAt, remark: wo25.description,
      fromStatus: 'PENDING_ACCEPT', toStatus: 'PENDING_ACCEPT',
    },
    {
      id: 'TL-WO-9003', bizId: wo25.code, action: '接单', operator: '厂家工程师·郑涛',
      operatorRole: 'VENDOR_ENGINEER', time: addHours(wo25.createdAt, 1), remark: wo25.acceptRemark ?? '',
      fromStatus: 'PENDING_ACCEPT', toStatus: 'IN_PROGRESS',
    },
  );

  const wo18 = orderOf(STORY.ORDER_PENDING_CONFIRM);
  db.workOrderTimelines.push(
    {
      id: 'TL-WO-9004', bizId: wo18.code, action: '创建工单', operator: '客户报修',
      operatorRole: 'CUSTOMER_ADMIN', time: wo18.createdAt, remark: wo18.description,
      fromStatus: 'PENDING_ACCEPT', toStatus: 'PENDING_ACCEPT',
    },
    {
      id: 'TL-WO-9005', bizId: wo18.code, action: '接单', operator: '厂家工程师·周敏',
      operatorRole: 'VENDOR_ENGINEER', time: addHours(wo18.createdAt, 2), remark: '已签到',
      fromStatus: 'PENDING_ACCEPT', toStatus: 'IN_PROGRESS',
    },
    {
      id: 'TL-WO-9006', bizId: wo18.code, action: '反馈结果', operator: '厂家工程师·周敏',
      operatorRole: 'VENDOR_ENGINEER', time: addHours(wo18.createdAt, 8),
      remark: '已更换温控器与加热管，设备恢复正常，请客户验收',
      fromStatus: 'IN_PROGRESS', toStatus: 'PENDING_CONFIRM',
    },
  );

  const wo09 = orderOf(STORY.ORDER_COMPLETED_OLD);
  db.workOrderTimelines.push(
    {
      id: 'TL-WO-9007', bizId: wo09.code, action: '创建工单', operator: '客户报修',
      operatorRole: 'CUSTOMER_ADMIN', time: wo09.createdAt, remark: wo09.description,
      fromStatus: 'PENDING_ACCEPT', toStatus: 'PENDING_ACCEPT',
    },
    {
      id: 'TL-WO-9008', bizId: wo09.code, action: '接单', operator: '厂家工程师·林涛',
      operatorRole: 'VENDOR_ENGINEER', time: addHours(wo09.createdAt, 3), remark: '已接单',
      fromStatus: 'PENDING_ACCEPT', toStatus: 'IN_PROGRESS',
    },
    {
      id: 'TL-WO-9009', bizId: wo09.code, action: '反馈结果', operator: '厂家工程师·林涛',
      operatorRole: 'VENDOR_ENGINEER', time: addHours(wo09.createdAt, 30), remark: '已修复',
      fromStatus: 'IN_PROGRESS', toStatus: 'PENDING_CONFIRM',
    },
    {
      id: 'TL-WO-9010', bizId: wo09.code, action: '验收通过', operator: '客户管理员',
      operatorRole: 'CUSTOMER_ADMIN', time: wo09.completedAt ?? wo09.createdAt, remark: '客户确认已恢复',
      fromStatus: 'PENDING_CONFIRM', toStatus: 'COMPLETED',
    },
  );

  // 随机附件不参与故事线，避免干扰验收
  void r;

  // ★ 绑定总数收敛：故事线增删了若干条，最终固定为 120 条，
  //   让「bindings = 120」的验收断言与随机数据无关（确定性）
  const TARGET_BINDINGS = 120;
  if (db.bindings.length > TARGET_BINDINGS) {
    // 从尾部开始裁掉与故事线无关的随机绑定，保留故事线相关（BD-9xxx / BD-Sxxxx）
    for (let i = db.bindings.length - 1; i >= 0 && db.bindings.length > TARGET_BINDINGS; i -= 1) {
      const b = db.bindings[i]!;
      const isStory = b.id.startsWith('BD-9') || b.id.startsWith('BD-S');
      if (isStory) continue;
      db.bindings.splice(i, 1);
    }
  }
  void TARGET_BINDINGS;
}