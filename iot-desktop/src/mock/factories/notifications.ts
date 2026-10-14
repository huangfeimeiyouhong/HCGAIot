/**
 * M-15 站内信（30 条）
 */
import { addDays } from '@/utils/date';

import { NOTIFY_TYPE_LABEL } from '@/constants/dict';

import type { Random } from '../types';
import type { Notification, NotifyType, Tenant } from '@/types';

/** 通知内容模板：[type, refType, titleTpl, contentTpl] */
const NOTIFY_DEFS: Array<[NotifyType, Notification['refType'], string, string]> = [
  ['SLA_TIMEOUT', 'ORDER', '工单 {{code}} 已超时', '该工单处理时限已超期，请尽快处理并反馈结果。'],
  ['AUDIT_RESULT', 'APPLICATION', '入驻申请 {{code}} 审核结果已更新', '您的入驻申请状态已变更，请登录厂家端查看详情。'],
  ['DISPUTE', 'DISPUTE', '争议 {{code}} 已受理', '平台已受理该争议并安排仲裁专员跟进。'],
  ['SYSTEM', undefined, '平台服务升级公告', '平台将于本周日 02:00-04:00 进行例行维护，期间不影响数据采集。'],
  ['ORDER_PROGRESS', 'ORDER', '工单 {{code}} 进展更新', '责任厂家已提交处理进展，请关注详情页。'],
  ['BINDING_CONFIRM', 'BINDING', '绑定申报待确认', '厂家为您申报了一条产权绑定，7 天内未确认将自动生效。'],
  ['ALARM_REMIND', 'ALARM', '告警 {{code}} 未确认', '该告警已持续 {{n}} 分钟未确认，请及时处理。'],
];

/**
 * 生成站内信
 * @param r 随机工具
 * @param tenants 租户列表
 * @returns 30 条通知
 */
export function genNotifications(r: Random, tenants: Tenant[]): Notification[] {
  const targets = tenants.filter((t) => t.status === 'ACTIVE');
  const list: Notification[] = [];

  for (let i = 1; i <= 30; i += 1) {
    const [type, refType, titleTpl, contentTpl] = r.pick(NOTIFY_DEFS);
    const tenant = r.pick(targets.length ? targets : tenants);
    const refId =
      refType === 'ORDER'
        ? `WO-2026-${r.pad(r.int(1, 64), 4)}`
        : refType === 'ALARM'
          ? `ALM-2026-${r.pad(r.int(1, 140), 4)}`
          : refType === 'APPLICATION'
            ? `ONB-2026-${r.pad(r.int(1, 9), 4)}`
            : refType === 'BINDING'
              ? `BD-${r.pad(r.int(1, 120), 4)}`
              : refType === 'DISPUTE'
                ? `DSP-${r.pad(r.int(1, 6), 4)}`
                : undefined;

    list.push({
      id: `NTF-${r.pad(i, 4)}`,
      tenantId: tenant.id,
      type,
      title: titleTpl
        .replace('{{code}}', refId ?? '')
        .replace('{{n}}', String(r.int(5, 90))),
      content: contentTpl
        .replace('{{code}}', refId ?? '')
        .replace('{{n}}', String(r.int(5, 90))),
      isRead: r.bool(0.55),
      refType,
      refId,
      createdAt: addDays(new Date().toISOString(), -r.int(0, 20)),
    });
  }

  return list;
}

/** 通知类型中文名（表格渲染用） */
export function notifyTypeLabel(type: string): string {
  return NOTIFY_TYPE_LABEL[type] ?? type;
}