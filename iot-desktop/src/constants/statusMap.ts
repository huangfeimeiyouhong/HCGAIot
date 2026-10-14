/**
 * 状态码 → 中文名 + 徽标色调（说明书 9.4 唯一来源）
 *
 * ⚠️ 改一处要同步改多处（约定 6 / S1）：
 * ① types/enums.ts 联合类型 → ② 本文件 LABEL + TONE_MAP → ③ constants/stateMachine.ts
 * → ④ mock/factories/* 的状态分布覆盖
 */
import type { StatusTone } from '@/types';

/** 状态码 → 中文名 */
export const STATUS_LABEL: Record<string, string> = {
  // ── 入驻申请 7 态 ──
  DRAFT: '草稿',
  PENDING_PRIMARY: '待初审',
  PENDING_SECONDARY: '待复审',
  RECTIFY: '待整改',
  REJECTED: '已驳回',
  TRIAL: '试运营',

  // ── 工单 5 态 ──
  PENDING_ACCEPT: '待接单',
  IN_PROGRESS: '处理中',
  PENDING_CONFIRM: '待验收',
  COMPLETED: '已完成',
  CLOSED: '已关闭',

  // ── 告警 4 态 ──
  UNCONFIRMED: '未确认',
  CONFIRMED: '已确认',
  RECOVERED: '已恢复',

  // ── 绑定 4 态（PENDING_CONFIRM 同码不同义，见 labelOfBinding）──
  PENDING_RELEASE: '待解除',
  RELEASED: '已解除',

  // ── 租户 4 态（ACTIVE 与入驻/绑定共用，语义一致=生效中）──
  PENDING: '待激活',
  FROZEN: '已冻结',
  EXPIRED: '已过期',

  // ── 设备 5 态 ──
  ONLINE: '在线',
  OFFLINE: '离线',
  ABNORMAL: '异常',
  INACTIVE: '未启用',
  REPAIRING: '维修中',

  // ── 告警等级 / 工单优先级（URGENT·NORMAL 与优先级 HIGH·LOW 同码，中文一致）──
  URGENT: '紧急',
  NORMAL: '一般',
  IMPORTANT: '重要',
  HIGH: '高',
  LOW: '低',

  // ── 账号状态 3 态 ──
  PENDING_APPROVE: '待审批',
  DISABLED: '已禁用',

  // ── 争议判定 3 档 ──
  VENDOR_BREACH: '厂家违约',
  CUSTOMER_CAUSE: '客户原因',
  NEGOTIATED: '协商解决',
};

/** 全局生效中（入驻 ACTIVE / 绑定 ACTIVE / 租户 ACTIVE 共用同一语义与色调） */
STATUS_LABEL.ACTIVE = '生效中';

/**
 * 状态码 → 徽标色调
 * 注意：`PENDING_CONFIRM` 在工单语境是「待验收」（confirm 色），
 * 在绑定语境是「待客户确认」（waiting 色），绑定场景请显式传覆盖项。
 */
export const TONE_MAP: Record<string, StatusTone> = {
  // 入驻
  DRAFT: 'info',
  PENDING_PRIMARY: 'waiting',
  PENDING_SECONDARY: 'waiting',
  RECTIFY: 'waiting',
  REJECTED: 'reject',
  TRIAL: 'trial',
  ACTIVE: 'success',
  // 工单
  PENDING_ACCEPT: 'waiting',
  IN_PROGRESS: 'processing',
  PENDING_CONFIRM: 'confirm',
  COMPLETED: 'success',
  CLOSED: 'closed',
  // 告警
  UNCONFIRMED: 'waiting',
  CONFIRMED: 'info',
  PROCESSING: 'processing',
  RECOVERED: 'success',
  // 绑定
  PENDING_RELEASE: 'notice',
  RELEASED: 'closed',
  // 租户
  PENDING: 'waiting',
  FROZEN: 'reject',
  EXPIRED: 'closed',
  // 设备
  ONLINE: 'success',
  OFFLINE: 'closed',
  ABNORMAL: 'reject',
  INACTIVE: 'closed',
  REPAIRING: 'notice',
  // 等级 / 优先级
  URGENT: 'reject',
  IMPORTANT: 'waiting',
  NORMAL: 'info',
  HIGH: 'notice',
  LOW: 'closed',
  // 账号
  PENDING_APPROVE: 'waiting',
  DISABLED: 'closed',
  // 争议
  VENDOR_BREACH: 'reject',
  CUSTOMER_CAUSE: 'closed',
  NEGOTIATED: 'info',
};

/** 绑定位的中文名与色调覆盖（区分 PENDING_CONFIRM 同码不同义） */
const BINDING_LABEL: Record<string, string> = {
  PENDING_CONFIRM: '待客户确认',
  ACTIVE: '生效中',
  PENDING_RELEASE: '待解除',
  RELEASED: '已解除',
};

const BINDING_TONE: Record<string, StatusTone> = {
  PENDING_CONFIRM: 'waiting',
  ACTIVE: 'success',
  PENDING_RELEASE: 'notice',
  RELEASED: 'closed',
};

/** 使用活跃度 4 档（与优先级 HIGH/NORMAL/LOW 同码，此处单独出表） */
const ACTIVITY_LABEL: Record<string, string> = {
  HIGH: '高活跃',
  NORMAL: '正常活跃',
  LOW: '低活跃',
  ZOMBIE: '僵尸设备',
};

const ACTIVITY_TONE: Record<string, StatusTone> = {
  HIGH: 'success',
  NORMAL: 'info',
  LOW: 'closed',
  ZOMBIE: 'reject',
};

/** 取状态中文名 */
export function labelOf(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

/** 取状态徽标色调 */
export function toneOf(status: string): StatusTone {
  return TONE_MAP[status] ?? 'closed';
}

/** 取绑定位中文名（区分同码不同义） */
export function labelOfBinding(status: string): string {
  return BINDING_LABEL[status] ?? labelOf(status);
}

/** 取绑定位徽标色调 */
export function toneOfBinding(status: string): StatusTone {
  return BINDING_TONE[status] ?? toneOf(status);
}

/** 取使用活跃度中文名 */
export function labelOfActivity(level: string): string {
  return ACTIVITY_LABEL[level] ?? level;
}

/** 取使用活跃度徽标色调 */
export function toneOfActivity(level: string): StatusTone {
  return ACTIVITY_TONE[level] ?? 'info';
}