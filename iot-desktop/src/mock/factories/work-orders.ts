/**
 * M-11 工单（64 条）+ M-12 时间轴 + 进展 + M-13 备件
 */
import { addDays, addHours } from '@/utils/date';

import { SLA_DEFAULT } from '@/constants/sla';

import type { Random } from '../types';
import type {
  Alarm,
  Attachment,
  Device,
  Priority,
  ProgressRecord,
  ProblemType,
  SparePart,
  TimelineRecord,
  VendorType,
  WorkOrder,
  WorkOrderSource,
  WorkOrderStatus,
} from '@/types';

/** 描述模板 */
const DESCRIPTIONS = [
  '设备启动后报 E1 故障码，无法正常工作，请安排工程师上门检修。',
  '制冷效果明显下降，柜内温度长时间高于设定值。',
  '运行中有明显异响，怀疑轴承损坏，请现场确认。',
  '显示屏黑屏，触控无响应，需更换控制面板。',
  '燃气报警器间歇性报警，现场未检测到泄漏，需排查管路。',
  '清洗后无法排水，怀疑排水泵堵塞，请疏通处理。',
  '咨询设备日常保养与耗材更换周期。',
  '排烟风机启动后噪音极大，客户投诉影响营业。',
  '门封条老化严重，柜门无法闭合，需整体更换。',
  '设备频繁跳闸，怀疑线路接触不良，请排查用电安全。',
];

/** 备件名与规格 */
const SPARE_DEFS: Array<[string, string]> = [
  ['温控器', 'WK-2026-A'],
  ['加热管', 'RG-2026-B'],
  ['压缩机', 'BZ-315'],
  ['风机电机', 'FJ-180W'],
  ['门封条', 'MF-620'],
  ['电源模块', 'DY-24V'],
  ['燃气探测器', 'RQ-NG2026'],
  ['排水泵', 'PS-35W'],
];

/**
 * 生成工单
 * @param r 随机工具
 * @param devices 设备列表
 * @param alarms 告警列表
 * @param vendorOf 设备 → 责任厂家
 * @returns 64 条工单
 */
export function genWorkOrders(
  r: Random,
  devices: Device[],
  alarms: Alarm[],
  vendorOf: (d: Device) => string,
): WorkOrder[] {
  const orders: WorkOrder[] = [];
  const boundDevices = devices.filter((d) => d.ownerCustomerId);
  const pool = boundDevices.length ? boundDevices : devices;
  const unassignedAlarms = alarms.filter((a) => !a.orderId);
  /** 已被前面工单占用的告警 id（同一告警不得转出两张工单） */
  const consumedAlarms = new Set<string>();

  // 状态分布：每态 ≥8 条
  const statusPlan: WorkOrderStatus[] = [
    ...Array(14).fill('PENDING_ACCEPT'),
    ...Array(15).fill('IN_PROGRESS'),
    ...Array(14).fill('PENDING_CONFIRM'),
    ...Array(13).fill('COMPLETED'),
    ...Array(8).fill('CLOSED'),
  ];

  statusPlan.forEach((status, index) => {
    const device = pool[index % pool.length]!;
    // 告警转单只能取「本设备上、尚未转单」的告警。
    // 曾用 unassignedAlarms[index] 跨设备取，导致工单与告警分属不同设备，
    // 详情页出现「工单设备 ≠ 告警设备」的错位（实测 13 张）。
    const alarm =
      status === 'PENDING_ACCEPT'
        ? unassignedAlarms.find((a) => a.deviceSn === device.sn && !consumedAlarms.has(a.id))
        : undefined;
    if (alarm) consumedAlarms.add(alarm.id);
    const createdAt = addDays(new Date().toISOString(), -r.int(0, 45));
    const priority = r.weighted<Priority>([
      { value: 'URGENT', weight: 14 },
      { value: 'HIGH', weight: 30 },
      { value: 'NORMAL', weight: 42 },
      { value: 'LOW', weight: 14 },
    ]);
    const sla = SLA_DEFAULT[priority];
    const deadlineAt = addHours(createdAt, sla.handleHours);
    const problemType = r.weighted<ProblemType>([
      { value: 'DEVICE_FAULT', weight: 46 },
      { value: 'PART_FAULT', weight: 24 },
      { value: 'PARAM_ABNORMAL', weight: 16 },
      { value: 'CONSULT', weight: 8 },
      { value: 'OTHER', weight: 6 },
    ]);

    const order: WorkOrder = {
      code: `WO-2026-${r.pad(index + 1, 4)}`,
      source: alarm ? 'ALARM_TRANSFER' : r.weighted<WorkOrderSource>([
        { value: 'CUSTOMER_REPAIR', weight: 78 },
        { value: 'VENDOR_INITIATE', weight: 22 },
      ]),
      deviceSn: device.sn,
      alarmId: alarm?.id,
      vendorId: vendorOf(device),
      customerId: device.ownerCustomerId ?? `TEN-0005`,
      problemType,
      description: alarm ? `${alarm.type}触发系统告警，自动生成工单：${alarm.deviceSn}` : r.pick(DESCRIPTIONS),
      priority,
      sla,
      status,
      deadlineAt,
      rejectCount: 0,
      disputeFlag: false,
      createdAt,
      escalationLevel: 0,
      attachments: status === 'PENDING_CONFIRM' || status === 'COMPLETED' || status === 'CLOSED'
        ? [{ id: `AT-SP-${r.pad(index + 1, 4)}`, name: '现场照片-1.jpg', category: 'SITE_PHOTO', size: r.int(180, 900) * 1024 }]
        : [],
    };

    if (status === 'IN_PROGRESS') {
      order.acceptRemark = r.pick(['已电话联系客户，约定上门时间', '已派单，工程师在路上', '已远程指导客户排查']);
      order.etaAt = addHours(createdAt, r.int(4, 24));
    }
    if (status === 'PENDING_CONFIRM' || status === 'COMPLETED' || status === 'CLOSED') {
      order.acceptRemark = r.pick(['已电话联系客户，约定上门时间', '现场签到后开始检修']);
      order.etaAt = addHours(createdAt, r.int(2, 12));
      order.completedAt = status === 'CLOSED' || status === 'COMPLETED'
        ? addHours(createdAt, sla.handleHours)
        : undefined;
      if (status === 'COMPLETED') {
        order.rating = r.bool(0.7)
          ? { score: r.int(3, 5), comment: r.pick(['响应很快，处理得当', '师傅专业，已恢复正常', '服务满意']), ratedAt: addHours(createdAt, sla.handleHours + 4) }
          : undefined;
      }
    }
    if (status === 'CLOSED') {
      order.completedAt = addDays(new Date().toISOString(), -r.int(8, 40));
    }

    orders.push(order);
  });

  // 回填告警 → 工单关联
  orders.forEach((o) => {
    if (!o.alarmId) return;
    const alarm = alarms.find((a) => a.id === o.alarmId);
    if (alarm) {
      alarm.orderId = o.code;
      if (o.status !== 'PENDING_ACCEPT') alarm.status = 'PROCESSING';
    }
  });

  return orders;
}

/**
 * 生成工单时间轴
 * @param r 随机工具
 * @param orders 工单列表
 * @returns 时间轴数组
 */
export function genWorkOrderTimelines(r: Random, orders: WorkOrder[]): TimelineRecord[] {
  const records: TimelineRecord[] = [];
  let seq = 0;
  const push = (
    bizId: string,
    action: string,
    operator: string,
    operatorRole: TimelineRecord['operatorRole'],
    time: string,
    remark: string,
    fromStatus?: string,
    toStatus?: string,
  ): void => {
    seq += 1;
    records.push({ id: `TL-WO-${r.pad(seq, 5)}`, bizId, action, operator, operatorRole, time, remark, fromStatus, toStatus });
  };

  orders.forEach((o) => {
    push(o.code, '创建工单', `${o.source === 'ALARM_TRANSFER' ? '系统告警转单' : '客户报修'}`, 'CUSTOMER_ADMIN', o.createdAt, o.description, 'PENDING_ACCEPT', 'PENDING_ACCEPT');
    if (o.status === 'PENDING_ACCEPT') return;

    push(o.code, '接单', '厂家工程师', 'VENDOR_ENGINEER', addHours(o.createdAt, r.int(1, 4)), o.acceptRemark ?? '已接单', 'PENDING_ACCEPT', 'IN_PROGRESS');
    if (o.status === 'IN_PROGRESS') return;

    push(o.code, '反馈结果', '厂家工程师', 'VENDOR_ENGINEER', addHours(o.createdAt, r.int(5, 20)), '已完成现场检修与备件更换，请客户确认', 'IN_PROGRESS', 'PENDING_CONFIRM');
    if (o.status === 'PENDING_CONFIRM') return;

    push(o.code, '验收通过', '客户管理员', 'CUSTOMER_ADMIN', addHours(o.createdAt, r.int(22, 40)), '客户现场确认已恢复正常', 'PENDING_CONFIRM', 'COMPLETED');
    if (o.status === 'COMPLETED') return;

    push(o.code, '归档关闭', '系统自动', 'PLATFORM_ADMIN', o.completedAt ?? addDays(o.createdAt, 9), '完成满 7 天，自动归档', 'COMPLETED', 'CLOSED');
  });

  return records;
}

/**
 * 生成工单进展记录（处理中及以后的工单各 1~3 条）
 * @param r 随机工具
 * @param orders 工单列表
 * @returns 进展记录数组
 */
export function genWorkOrderProgress(r: Random, orders: WorkOrder[]): ProgressRecord[] {
  const list: ProgressRecord[] = [];
  let seq = 0;
  const contents = [
    '工程师已出发，预计 2 小时内到场。',
    '已到场，正在拆卸故障部件。',
    '故障部件已更换，正在做功能验证。',
    '设备已恢复正常运行，观察 30 分钟无异常。',
    '已完成清理与保养，等待客户确认。',
  ];

  orders
    .filter((o) => o.status !== 'PENDING_ACCEPT')
    .forEach((o) => {
      const count = r.int(1, 3);
      for (let i = 0; i < count; i += 1) {
        seq += 1;
        list.push({
          id: `PR-${r.pad(seq, 4)}`,
          orderCode: o.code,
          content: r.pick(contents),
          operator: '厂家工程师',
          time: addHours(o.createdAt, r.int(2, o.sla.handleHours)),
          attachments: [],
        });
      }
    });

  return list;
}

/**
 * 生成备件记录（40 条）
 * @param r 随机工具
 * @param orders 工单列表（仅待验收及以后有备件）
 * @returns 备件数组
 */
export function genSpareParts(r: Random, orders: WorkOrder[]): SparePart[] {
  const list: SparePart[] = [];
  const candidates = orders.filter((o) => o.status === 'PENDING_CONFIRM' || o.status === 'COMPLETED' || o.status === 'CLOSED');
  let seq = 0;

  candidates.forEach((o) => {
    if (list.length >= 40) return;
    if (!r.bool(0.55)) return;
    const [name, spec] = r.pick(SPARE_DEFS);
    seq += 1;
    list.push({
      id: `SP-${r.pad(seq, 4)}`,
      orderCode: o.code,
      name,
      spec,
      quantity: r.int(1, 3),
      sn: `SN-${r.pad(r.int(100000, 999999), 6)}`,
      oldPartRecycled: r.bool(0.85),
      oldPartDestination: '厂家回收仓',
      createdAt: addHours(o.createdAt, r.int(5, 20)),
    });
  });

  // 不足 40 条时补齐
  while (list.length < 40 && candidates.length) {
    seq += 1;
    const o = candidates[seq % candidates.length]!;
    const [name, spec] = r.pick(SPARE_DEFS);
    list.push({
      id: `SP-${r.pad(seq, 4)}`,
      orderCode: o.code,
      name,
      spec,
      quantity: 1,
      oldPartRecycled: true,
      oldPartDestination: '厂家回收仓',
      createdAt: addHours(o.createdAt, r.int(5, 20)),
    });
  }

  return list;
}

/** 附件占位构造（api 层写操作用） */
export function mockAttachment(r: Random, name: string): Attachment {
  return { id: `AT-${r.pad(r.int(1, 99999), 5)}`, name, category: 'SITE_PHOTO', size: r.int(100, 2000) * 1024 };
}

/** 厂家类型相关的 SLA 快照（预留：不同厂家类型 SLA 基准不同） */
export function slaOfVendor(_vendorType: VendorType) {
  return SLA_DEFAULT.NORMAL;
}