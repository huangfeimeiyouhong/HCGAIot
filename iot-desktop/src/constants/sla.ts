/**
 * SLA 常量 —— 时限默认值、三级升级阈值、关键业务天数
 * ⚠️ 改 SLA 时限只改本文件（约定 6 / S5）
 */
import type { Priority, SlaCommitment } from '@/types';

/**
 * 四优先级 × 三段时限默认值（小时）
 * ⚠️ 按架构文档 A10.2 Q-A7 假设值实现，待 Phil 拍板；改此处即全局生效
 * 紧急：接单 0.5h(30 分钟) / 处理 4h / 验收 24h
 */
export const SLA_DEFAULT: Record<Priority, SlaCommitment> = {
  URGENT: { acceptHours: 0.5, handleHours: 4, confirmHours: 24 },
  HIGH: { acceptHours: 2, handleHours: 8, confirmHours: 48 },
  NORMAL: { acceptHours: 8, handleHours: 24, confirmHours: 72 },
  LOW: { acceptHours: 24, handleHours: 72, confirmHours: 168 },
};

/** 优先级中文名 */
export const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: '紧急',
  HIGH: '高',
  NORMAL: '中',
  LOW: '低',
};

/** 三级 SLA 升级阈值（已消耗时限 / 总时限） */
export const ESCALATION_THRESHOLD = {
  /** ≥80% 一级提醒（站内信） */
  L1: 0.8,
  /** ≥100% 二级催办（站内信 + 短信） */
  L2: 1.0,
  /** ≥200% 三级升级（平台介入 + 标记争议） */
  L3: 2.0,
} as const;

/** 三级升级提示文案 */
export const ESCALATION_TEXT: Record<number, string> = {
  0: '',
  1: '一级提醒：SLA 时限已消耗 80%，请尽快处理',
  2: '二级催办：SLA 时限已超时，请立即处理（已发催办通知）',
  3: '三级升级：SLA 时限已严重超时，平台已介入并标记争议',
};

/** 试运营期天数（⚠️ 待 Phil 确认，A10.2 Q-A8） */
export const TRIAL_DAYS = 60;

/** 绑定申报自动确认天数（客户 7 天不响应则自动生效） */
export const BINDING_AUTO_CONFIRM_DAYS = 7;

/** 工单完成后自动归档天数 */
export const ORDER_ARCHIVE_DAYS = 7;

/** 验收驳回次数超过该值 → 详情页显示「需平台介入」 */
export const REJECT_ESCALATE_THRESHOLD = 3;

/**
 * 按优先级取 SLA 默认值
 * @param priority 工单优先级
 * @returns SLA 三段时限（小时）
 */
export function slaOf(priority: Priority): SlaCommitment {
  return SLA_DEFAULT[priority] ?? SLA_DEFAULT.NORMAL;
}

/**
 * 把小时数格式化为中文时长文案
 * @param hours 小时数（可为小数，如 0.5）
 * @returns 如「30 分钟」「4 小时」「7 天」
 */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} 分钟`;
  if (hours < 24) {
    const intPart = Math.floor(hours);
    const minPart = Math.round((hours - intPart) * 60);
    return minPart > 0 ? `${intPart} 小时 ${minPart} 分` : `${intPart} 小时`;
  }
  const days = hours / 24;
  return Number.isInteger(days) ? `${days} 天` : `${days.toFixed(1)} 天`;
}

/**
 * 生成 SLA 预览文案
 * @param priority 优先级
 * @returns 如「紧急：接单 30 分钟 / 处理 4 小时 / 待验收 24 小时」
 */
export function slaPreviewText(priority: Priority): string {
  const s = slaOf(priority);
  return `${PRIORITY_LABEL[priority]}：接单 ${formatHours(s.acceptHours)} / 处理 ${formatHours(s.handleHours)} / 待验收 ${formatHours(s.confirmHours)}`;
}

/**
 * 计算 SLA 已消耗比例（用于升级级别判定）
 * @param createdAt 起始时间 ISO 串
 * @param deadlineAt 截止时间 ISO 串
 * @param now 当前时间（默认 Date.now()，便于测试注入）
 * @returns 已消耗比例；<=0 表示未开始
 */
export function calcSlaRatio(createdAt: string, deadlineAt: string, now: number = Date.now()): number {
  const start = new Date(createdAt).getTime();
  const end = new Date(deadlineAt).getTime();
  const total = end - start;
  if (total <= 0) return 1;
  return (now - start) / total;
}

/**
 * 依已消耗比例计算升级级别
 * @param ratio 已消耗比例（calcSlaRatio 的返回值）
 * @returns 0~3
 */
export function escalationOf(ratio: number): 0 | 1 | 2 | 3 {
  if (ratio >= ESCALATION_THRESHOLD.L3) return 3;
  if (ratio >= ESCALATION_THRESHOLD.L2) return 2;
  if (ratio >= ESCALATION_THRESHOLD.L1) return 1;
  return 0;
}