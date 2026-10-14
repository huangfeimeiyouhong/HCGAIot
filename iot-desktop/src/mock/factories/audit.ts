/**
 * M-16 审计日志（60 条）+ M-19 争议（6 条）
 */
import { addDays, addHours } from '@/utils/date';

import { AUDIT_ACTION_LABEL } from '@/constants/dict';
import { ESCALATION_TEXT } from '@/constants/sla';

import type { Random } from '../types';
import type { AuditAction, AuditLog, Dispute, Device, Tenant, WorkOrder } from '@/types';

/**
 * 生成审计日志
 * @param r 随机工具
 * @param tenants 租户列表
 * @returns 60 条日志
 */
export function genAuditLogs(r: Random, tenants: Tenant[]): AuditLog[] {
  const list: AuditLog[] = [];
  const actions: AuditAction[] = ['ACCOUNT_MANAGE', 'BINDING_CHANGE', 'DATA_EXPORT', 'ORDER_HANDLE'];

  for (let i = 1; i <= 60; i += 1) {
    const action = r.pick(actions);
    const tenant = r.pick(tenants);
    const time = addDays(new Date().toISOString(), -r.int(0, 60));
    list.push({
      id: `LOG-${r.pad(i, 4)}`,
      operator: r.pick(['平台超级管理员', '平台运营', '入驻审核员', '数据专员', '厂家管理员', '客户管理员']),
      tenantId: tenant.id,
      action,
      target:
        action === 'ACCOUNT_MANAGE'
          ? `账号 ACC-${r.pad(r.int(1, 60), 4)}`
          : action === 'BINDING_CHANGE'
            ? `绑定 BD-${r.pad(r.int(1, 120), 4)}`
            : action === 'DATA_EXPORT'
              ? `设备台账导出（${r.int(1, 200)} 条）`
              : `工单 WO-2026-${r.pad(r.int(1, 64), 4)}`,
      before: action === 'BINDING_CHANGE' ? 'status=PENDING_CONFIRM' : action === 'ACCOUNT_MANAGE' ? 'status=DISABLED' : '—',
      after: action === 'BINDING_CHANGE' ? 'status=ACTIVE' : action === 'ACCOUNT_MANAGE' ? 'status=ACTIVE' : '—',
      ip: `10.${r.int(0, 40)}.${r.int(0, 255)}.${r.int(1, 254)}`,
      time,
    });
  }

  return list;
}

/**
 * 生成争议（6 条）
 * @param r 随机工具
 * @param orders 工单列表（优先挑已关闭且驳回次数多的）
 * @returns 6 条争议
 */
export function genDisputes(r: Random, orders: WorkOrder[], devices: Device[], tenants: Tenant[]): Dispute[] {
  const candidates = orders.filter((o) => o.status === 'CLOSED' || o.status === 'COMPLETED');
  const pool = candidates.length ? candidates : orders;
  const list: Dispute[] = [];

  for (let i = 1; i <= 6; i += 1) {
    const order = pool[Math.min(pool.length - 1, i * 7)]!;
    const device = devices.find((d) => d.sn === order.deviceSn);
    const customer = tenants.find((t) => t.id === order.customerId);
    const createdAt = addHours(order.createdAt, order.sla.handleHours + r.int(4, 40));
    list.push({
      id: `DSP-${r.pad(i, 4)}`,
      orderCode: order.code,
      raisedBy: r.bool(0.55) ? 'CUSTOMER' : 'VENDOR',
      type: r.pick(['SLA 超时责任', '备件费用争议', '维修质量争议', '数据真实性争议', '其他']),
      evidence: ([
        { side: 'CUSTOMER', fileName: '客户举证-现场照片.jpg', time: addHours(createdAt, 2) },
        { side: 'VENDOR', fileName: '厂家举证-维修记录.pdf', time: addHours(createdAt, 6) },
        { side: 'PLATFORM', fileName: '平台举证-SLA计时日志.csv', time: addHours(createdAt, 10) },
      ] as Dispute['evidence']).slice(0, r.int(2, 3)),
      slaJudgement: `工单创建至接单耗时 ${r.int(1, 12)} 小时，接单至反馈耗时 ${r.int(3, 30)} 小时；${ESCALATION_TEXT[order.escalationLevel] || '未触发升级'}。`,
      verdict: r.bool(0.5) ? r.pick(['VENDOR_BREACH', 'CUSTOMER_CAUSE', 'NEGOTIATED'] as const) : undefined,
      verdictNote: r.bool(0.5) ? '依据双方举证与 SLA 计时记录作出判定。' : undefined,
      verdictTime: r.bool(0.5) ? addHours(createdAt, 48) : undefined,
      operator: r.bool(0.5) ? '平台仲裁专员·周宁' : undefined,
      createdAt,
      // 附带的说明性字段（不进实体，仅工厂内部可读）
      ...(device && customer ? {} : {}),
    });
  }

  return list;
}

/** 审计动作中文名 */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}