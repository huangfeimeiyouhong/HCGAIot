/**
 * M-08 绑定关系（120 条）+ M-09 变更历史（append-only）
 */
import { addDays } from '@/utils/date';

import { BINDING_AUTO_CONFIRM_DAYS } from '@/constants/sla';

import type { Random } from '../types';
import type { Binding, BindingHistory, BindingStatus, BindingType, Device, Tenant } from '@/types';

/**
 * 生成绑定关系
 *
 * 结构保证（让隔离验收可跑通，勿随意打乱）：
 * 1. 每台设备一条「装配绑定」指向型号所属厂家 —— 厂家一定能看到自己的全部设备
 * 2. 每个「厂家服务范围内的客户」至少一条「生效产权绑定」—— 否则客户 scope 算出 0 台设备
 * 3. 剩余名额按状态权重随机填充，形成待确认 / 待解除 / 已解除的分布
 *
 * @param r 随机工具
 * @param devices 设备列表
 * @param tenants 租户列表（提供客户与厂家）
 * @returns 绑定列表（120 条；故事线会再增删 1 条，最终仍为 120）
 */
export function genBindings(r: Random, devices: Device[], tenants: Tenant[]): Binding[] {
  const vendors = tenants.filter(
    (t) => t.type === 'VENDOR' && (t.auditStatus === 'ACTIVE' || t.auditStatus === 'TRIAL'),
  );
  const customers = tenants.filter((t) => t.type === 'CUSTOMER');
  const bindings: Binding[] = [];
  let seq = 0;

  /** 设备 → 型号所属厂家 */
  const vendorOf = (d: Device): string => (d.modelCode.startsWith('IOT') ? 'TEN-0002' : 'TEN-0001');

  /** 追加一条绑定 */
  const push = (
    device: Device,
    customerId: string,
    vendorId: string,
    type: BindingType,
    status: BindingStatus,
    source: Binding['source'],
    declaredDaysAgo: number,
  ): Binding => {
    seq += 1;
    const declaredAt = addDays(new Date().toISOString(), -declaredDaysAgo);
    const effectiveFrom = status === 'ACTIVE' ? addDays(declaredAt, 1) : declaredAt;
    const binding: Binding = {
      id: `BD-${r.pad(seq, 4)}`,
      deviceSn: device.sn,
      customerId,
      vendorId,
      type,
      source,
      effectiveFrom,
      effectiveTo: status === 'RELEASED' ? addDays(effectiveFrom, 120) : undefined,
      status,
      operator: r.pick(['系统管理员', '厂家运营', '厂家工程师', '平台运营']),
      autoConfirmed: source === 'AUTO_CONFIRM',
      declaredAt,
      autoConfirmDeadline: addDays(declaredAt, BINDING_AUTO_CONFIRM_DAYS),
      rejectReason: status === 'RELEASED' && type === 'OWNERSHIP' ? '设备产权归属有误，已拒绝' : undefined,
    };
    bindings.push(binding);
    return binding;
  };

  // ── 1. 每台设备一条装配绑定（指向型号所属厂家）──
  devices.forEach((device) => {
    const vendorId = vendorOf(device);
    const vendor = vendors.find((v) => v.id === vendorId);
    push(device, vendor?.serviceScope[0] ?? customers[0]!.id, vendorId, 'ASSEMBLY', 'ACTIVE', 'VENDOR_DECLARE', r.int(1, 60));
  });

  // ── 2. 每个「厂家 × 服务范围内客户」至少一条生效产权绑定 ──
  const assigned = new Set<string>();
  let cursor = 0;
  for (const vendor of vendors) {
    for (const customerId of vendor.serviceScope) {
      const key = `${vendor.id}:${customerId}`;
      if (assigned.has(key)) continue;
      assigned.add(key);
      // 优先选本厂家型号且尚未归属的设备
      const owned = devices.filter((d) => vendorOf(d) === vendor.id && !d.ownerCustomerId);
      const device = owned.length ? owned[cursor % owned.length]! : devices[cursor % devices.length]!;
      cursor += 1;
      if (device.ownerCustomerId) continue;
      push(device, customerId, vendor.id, 'OWNERSHIP', 'ACTIVE', 'VENDOR_DECLARE', r.int(3, 90));
    }
  }

  // ── 3. 剩余名额按状态权重随机填充 ──
  // 故事线会删掉 CK-XA-2026-0001 / 0007 的产权绑定并补 1 条待确认绑定（净 -1），
  // 故此处生成 121 条，故事线执行后正好 120 条
  const total = 121;
  while (bindings.length < total) {
    const device = r.pick(devices);
    const vendorId = vendorOf(device);
    const vendor = vendors.find((v) => v.id === vendorId);
    const pool = vendor?.serviceScope.length ? vendor.serviceScope : customers.map((c) => c.id);
    const type: BindingType = r.bool(0.55) ? 'OWNERSHIP' : 'ASSEMBLY';
    const status = r.weighted<BindingStatus>([
      { value: 'ACTIVE', weight: 55 },
      { value: 'PENDING_CONFIRM', weight: 17 },
      { value: 'PENDING_RELEASE', weight: 8 },
      { value: 'RELEASED', weight: 20 },
    ]);
    const source = r.weighted<Binding['source']>([
      { value: 'VENDOR_DECLARE', weight: 58 },
      { value: 'PLATFORM_IMPORT', weight: 30 },
      { value: 'AUTO_CONFIRM', weight: 12 },
    ]);
    push(device, r.pick(pool), vendorId, type, status, source, r.int(0, 90));
  }

  return bindings;
}

/**
 * 生成绑定变更历史（每条绑定 1~4 条）
 * @param r 随机工具
 * @param bindings 绑定列表
 * @returns 历史记录数组
 */
export function genBindingHistory(r: Random, bindings: Binding[]): BindingHistory[] {
  const history: BindingHistory[] = [];
  let seq = 0;

  bindings.forEach((b) => {
    const count = r.int(1, 4);
    for (let v = 1; v <= count; v += 1) {
      seq += 1;
      history.push({
        id: `BH-${r.pad(seq, 4)}`,
        bindingId: b.id,
        version: v,
        action: v === 1 ? '创建绑定' : ['更新生效时间', '变更客户', '申请解绑', '恢复生效'][v - 2] ?? '更新绑定',
        operator: b.operator,
        time: addDays(b.declaredAt ?? b.effectiveFrom, (v - 1) * r.int(1, 10)),
        reason: v === 1 ? '厂家申报建立绑定关系' : '按业务流程变更',
      });
    }
  });

  return history;
}

/**
 * 由绑定派生设备的归属客户与关联厂家
 *
 * - ownerCustomerId：生效产权绑定的客户（一条设备只归属一个客户，取第一条生效绑定）
 * - vendorIds：生效绑定的厂家集合（装配绑定可能多家）
 *
 * ⚠️ 厂家兜底：即使没有任何生效绑定，设备仍按型号归属到对应厂家
 *    （否则厂家在自己账号下看不到自己的设备，隔离演示会失真）
 *
 * @param devices 设备列表（就地修改 ownerCustomerId 与 vendorIds）
 * @param bindings 绑定列表
 */
export function deriveOwnerCustomer(devices: Device[], bindings: Binding[]): void {
  const ownership = new Map<string, string>();
  bindings
    .filter((b) => b.type === 'OWNERSHIP' && b.status === 'ACTIVE')
    .forEach((b) => {
      if (!ownership.has(b.deviceSn)) ownership.set(b.deviceSn, b.customerId);
    });
  devices.forEach((d) => {
    d.ownerCustomerId = ownership.get(d.sn) ?? null;
    const fromBindings = bindings
      .filter((b) => b.deviceSn === d.sn && b.status === 'ACTIVE')
      .map((b) => b.vendorId);
    const fallback = d.modelCode.startsWith('IOT') ? 'TEN-0002' : 'TEN-0001';
    d.vendorIds = Array.from(new Set([...fromBindings, fallback]));
  });
}