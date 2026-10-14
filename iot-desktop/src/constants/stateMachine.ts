/**
 * 状态机 —— 按钮组与徽标的唯一来源（说明书 9.4「状态定义唯一」）
 *
 * 四个业务状态机：工单 / 入驻 / 告警 / 绑定。
 * 迁移边与架构文档 A9.3 / A9.4 的流程图逐条一致。
 * ⚠️ 改迁移边需同步：mock/db.ts 的 applyTransition 副作用 + 涉及按钮组的页面（约定 6 / S12）
 */
import type {
  AlarmStatus,
  BindingStatus,
  OnboardingStatus,
  Role,
  StateAction,
  StateNode,
  WorkOrderStatus,
} from '@/types';

/** 机器键名 */
export type MachineKey = 'WORK_ORDER' | 'ONBOARDING' | 'ALARM' | 'BINDING';

const PLATFORM: Role = 'PLATFORM';
const VENDOR: Role = 'VENDOR';
const CUSTOMER: Role = 'CUSTOMER';

/* ============================================================
 * 工单状态机（5 态）
 * PENDING_ACCEPT → IN_PROGRESS → PENDING_CONFIRM → COMPLETED → CLOSED
 * PENDING_CONFIRM → IN_PROGRESS（客户验收驳回）
 * IN_PROGRESS ↔ PENDING_ACCEPT 之外不可跳跃
 * ============================================================ */
export const WORK_ORDER_MACHINE: Record<WorkOrderStatus, StateNode> = {
  PENDING_ACCEPT: {
    label: '待接单',
    actions: [
      {
        key: 'accept',
        label: '接单',
        tone: 'primary',
        confirm: { title: '确认接单', requireReason: false },
        roles: [VENDOR],
      },
      {
        key: 'cancel',
        label: '撤单',
        tone: 'danger',
        confirm: { title: '确认撤单', requireReason: true },
        roles: [CUSTOMER],
      },
      {
        key: 'dispute',
        label: '标记争议',
        tone: 'warning',
        confirm: { title: '确认标记争议', requireReason: true },
        roles: [PLATFORM],
      },
    ],
  },
  IN_PROGRESS: {
    label: '处理中',
    actions: [
      {
        key: 'addProgress',
        label: '更新进展',
        tone: 'primary',
        roles: [VENDOR],
      },
      {
        key: 'submitFeedback',
        label: '反馈处理结果',
        tone: 'success',
        confirm: { title: '提交处理结果', requireReason: false },
        roles: [VENDOR],
      },
      {
        key: 'dispute',
        label: '标记争议',
        tone: 'warning',
        confirm: { title: '确认标记争议', requireReason: true },
        roles: [PLATFORM],
      },
    ],
  },
  PENDING_CONFIRM: {
    label: '待验收',
    actions: [
      {
        key: 'accept',
        label: '验收通过',
        tone: 'success',
        confirm: { title: '确认验收通过', requireReason: false },
        roles: [CUSTOMER],
      },
      {
        key: 'reject',
        label: '验收驳回',
        tone: 'danger',
        confirm: { title: '验收驳回', requireReason: true },
        roles: [CUSTOMER],
      },
      {
        key: 'dispute',
        label: '标记争议',
        tone: 'warning',
        confirm: { title: '确认标记争议', requireReason: true },
        roles: [PLATFORM],
      },
    ],
  },
  COMPLETED: {
    label: '已完成',
    actions: [
      {
        key: 'rate',
        label: '评价',
        tone: 'primary',
        roles: [CUSTOMER],
      },
      {
        key: 'archive',
        label: '归档关闭',
        tone: 'warning',
        confirm: { title: '归档并关闭工单', requireReason: false },
        roles: [VENDOR, PLATFORM],
      },
    ],
  },
  CLOSED: {
    label: '已关闭',
    actions: [],
  },
};

/* ============================================================
 * 入驻申请状态机（7 态）
 * DRAFT → PENDING_PRIMARY → PENDING_SECONDARY → TRIAL → ACTIVE
 * PENDING_PRIMARY → RECTIFY（退回补充）
 * PENDING_SECONDARY → RECTIFY（标记整改）/ REJECTED（驳回）
 * RECTIFY → PENDING_SECONDARY（提交整改材料）
 * REJECTED → DRAFT（重新发起）
 * ============================================================ */
export const ONBOARDING_MACHINE: Record<OnboardingStatus, StateNode> = {
  DRAFT: {
    label: '草稿',
    actions: [
      {
        key: 'submit',
        label: '提交审核',
        tone: 'primary',
        confirm: { title: '提交入驻申请', requireReason: false },
        roles: [VENDOR],
      },
    ],
  },
  PENDING_PRIMARY: {
    label: '待初审',
    actions: [
      {
        key: 'passPrimary',
        label: '通过初审',
        tone: 'success',
        confirm: { title: '通过初审', requireReason: false },
        roles: [PLATFORM],
      },
      {
        key: 'returnBack',
        label: '退回补充',
        tone: 'warning',
        confirm: { title: '退回补充材料', requireReason: true },
        roles: [PLATFORM],
      },
      {
        key: 'reject',
        label: '驳回',
        tone: 'danger',
        confirm: { title: '驳回入驻申请', requireReason: true },
        roles: [PLATFORM],
      },
    ],
  },
  PENDING_SECONDARY: {
    label: '待复审',
    actions: [
      {
        key: 'passSecondary',
        label: '通过复审',
        tone: 'success',
        confirm: { title: '通过复审（进入试运营）', requireReason: false },
        roles: [PLATFORM],
      },
      {
        key: 'markRectify',
        label: '标记整改',
        tone: 'warning',
        confirm: { title: '标记整改', requireReason: true },
        roles: [PLATFORM],
      },
      {
        key: 'reject',
        label: '驳回',
        tone: 'danger',
        confirm: { title: '驳回入驻申请', requireReason: true },
        roles: [PLATFORM],
      },
    ],
  },
  RECTIFY: {
    label: '待整改',
    actions: [
      {
        key: 'resubmit',
        label: '提交整改材料',
        tone: 'primary',
        confirm: { title: '提交整改材料', requireReason: false },
        roles: [VENDOR],
      },
    ],
  },
  REJECTED: {
    label: '已驳回',
    actions: [
      {
        key: 'restart',
        label: '重新发起申请',
        tone: 'primary',
        confirm: { title: '重新发起入驻申请', requireReason: false },
        roles: [VENDOR],
      },
    ],
  },
  TRIAL: {
    label: '试运营',
    actions: [
      {
        key: 'confirmActive',
        label: '确认转正',
        tone: 'success',
        confirm: { title: '确认转为正式入驻', requireReason: false },
        roles: [PLATFORM],
      },
    ],
  },
  ACTIVE: {
    label: '正式入驻',
    actions: [],
  },
};

/* ============================================================
 * 告警状态机（4 态）
 * UNCONFIRMED → CONFIRMED → PROCESSING → RECOVERED
 * ============================================================ */
export const ALARM_MACHINE: Record<AlarmStatus, StateNode> = {
  UNCONFIRMED: {
    label: '未确认',
    actions: [
      {
        key: 'confirm',
        label: '确认告警',
        tone: 'primary',
        roles: [CUSTOMER, VENDOR],
      },
      {
        key: 'createOrder',
        label: '转工单',
        tone: 'primary',
        roles: [VENDOR],
      },
    ],
  },
  CONFIRMED: {
    label: '已确认',
    actions: [
      {
        key: 'process',
        label: '开始处理',
        tone: 'primary',
        roles: [VENDOR],
      },
    ],
  },
  PROCESSING: {
    label: '处理中',
    actions: [
      {
        key: 'recover',
        label: '标记恢复',
        tone: 'success',
        roles: [VENDOR],
      },
    ],
  },
  RECOVERED: {
    label: '已恢复',
    actions: [],
  },
};

/* ============================================================
 * 绑定状态机（4 态）
 * PENDING_CONFIRM → ACTIVE（客户确认或 7 天超时自动确认）
 * ACTIVE → PENDING_RELEASE → RELEASED（厂家申请解绑 → 客户/平台确认）
 * PENDING_CONFIRM → RELEASED（客户拒绝）
 * ============================================================ */
export const BINDING_MACHINE: Record<BindingStatus, StateNode> = {
  PENDING_CONFIRM: {
    label: '待客户确认',
    actions: [
      {
        key: 'confirm',
        label: '确认绑定',
        tone: 'success',
        confirm: { title: '确认绑定关系', requireReason: false },
        roles: [CUSTOMER],
      },
      {
        key: 'reject',
        label: '拒绝绑定',
        tone: 'danger',
        confirm: { title: '拒绝绑定关系', requireReason: true },
        roles: [CUSTOMER],
      },
    ],
  },
  ACTIVE: {
    label: '生效中',
    actions: [
      {
        key: 'requestRelease',
        label: '申请解绑',
        tone: 'warning',
        confirm: { title: '申请解除绑定', requireReason: true },
        roles: [VENDOR],
      },
    ],
  },
  PENDING_RELEASE: {
    label: '待解除',
    actions: [
      {
        key: 'confirmRelease',
        label: '确认解绑',
        tone: 'danger',
        confirm: { title: '确认解除绑定', requireReason: false },
        roles: [CUSTOMER, PLATFORM],
      },
      {
        key: 'cancelRelease',
        label: '撤销解绑申请',
        tone: 'primary',
        roles: [VENDOR],
      },
    ],
  },
  RELEASED: {
    label: '已解除',
    actions: [],
  },
};

/** 机器表 */
export const MACHINES: Record<MachineKey, Record<string, StateNode>> = {
  WORK_ORDER: WORK_ORDER_MACHINE as unknown as Record<string, StateNode>,
  ONBOARDING: ONBOARDING_MACHINE as unknown as Record<string, StateNode>,
  ALARM: ALARM_MACHINE as unknown as Record<string, StateNode>,
  BINDING: BINDING_MACHINE as unknown as Record<string, StateNode>,
};

/**
 * 合法迁移边表（from → to 的允许集合）
 * 由各机器的动作 key 语义推导，硬编码保证 applyTransition 的校验与流程图一致
 */
const TRANSITIONS: Record<MachineKey, Record<string, string[]>> = {
  WORK_ORDER: {
    PENDING_ACCEPT: ['IN_PROGRESS', 'CLOSED'],
    IN_PROGRESS: ['PENDING_CONFIRM'],
    PENDING_CONFIRM: ['COMPLETED', 'IN_PROGRESS'],
    COMPLETED: ['CLOSED'],
    CLOSED: [],
  },
  ONBOARDING: {
    DRAFT: ['PENDING_PRIMARY'],
    PENDING_PRIMARY: ['PENDING_SECONDARY', 'RECTIFY', 'REJECTED'],
    PENDING_SECONDARY: ['TRIAL', 'RECTIFY', 'REJECTED'],
    RECTIFY: ['PENDING_SECONDARY'],
    REJECTED: ['DRAFT'],
    TRIAL: ['ACTIVE'],
    ACTIVE: [],
  },
  ALARM: {
    UNCONFIRMED: ['CONFIRMED', 'PROCESSING'],
    CONFIRMED: ['PROCESSING'],
    PROCESSING: ['RECOVERED'],
    RECOVERED: [],
  },
  BINDING: {
    PENDING_CONFIRM: ['ACTIVE', 'RELEASED'],
    ACTIVE: ['PENDING_RELEASE'],
    PENDING_RELEASE: ['ACTIVE', 'RELEASED'],
    RELEASED: [],
  },
};

/**
 * 校验状态迁移是否合法
 * @param key 机器键
 * @param from 源状态
 * @param to 目标状态
 * @returns 合法返回 true
 */
export function canTransition(key: MachineKey, from: string, to: string): boolean {
  if (from === to) return false;
  const allowed = TRANSITIONS[key]?.[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * 取某状态下、指定角色可执行的动作列表
 * @param key 机器键
 * @param status 当前状态
 * @param role 当前登录角色（不传则返回全部动作）
 * @returns 动作数组
 */
export function actionsOf(key: MachineKey, status: string, role?: Role): StateAction[] {
  const node = MACHINES[key]?.[status];
  if (!node) return [];
  const list = node.actions ?? [];
  return role ? list.filter((a) => a.roles.includes(role)) : [...list];
}

/**
 * 取某状态的节点定义（label + actions）
 * @param key 机器键
 * @param status 状态
 * @returns 节点定义；不存在时返回空节点
 */
export function nodeOf(key: MachineKey, status: string): StateNode {
  return MACHINES[key]?.[status] ?? { label: status, actions: [] };
}

/** 工单 5 态渲染顺序（TimelineSteps 用） */
export const WORK_ORDER_STEPS: Array<{ status: string; label: string }> = [
  { status: 'PENDING_ACCEPT', label: '待接单' },
  { status: 'IN_PROGRESS', label: '处理中' },
  { status: 'PENDING_CONFIRM', label: '待验收' },
  { status: 'COMPLETED', label: '已完成' },
  { status: 'CLOSED', label: '已关闭' },
];

/** 入驻 7 态渲染顺序（TimelineSteps 用） */
export const ONBOARDING_STEPS: Array<{ status: string; label: string }> = [
  { status: 'DRAFT', label: '草稿' },
  { status: 'PENDING_PRIMARY', label: '待初审' },
  { status: 'PENDING_SECONDARY', label: '待复审' },
  { status: 'RECTIFY', label: '待整改' },
  { status: 'TRIAL', label: '试运营' },
  { status: 'ACTIVE', label: '正式入驻' },
];

/** 告警 4 态渲染顺序（TimelineSteps 用） */
export const ALARM_STEPS: Array<{ status: string; label: string }> = [
  { status: 'UNCONFIRMED', label: '未确认' },
  { status: 'CONFIRMED', label: '已确认' },
  { status: 'PROCESSING', label: '处理中' },
  { status: 'RECOVERED', label: '已恢复' },
];

/** 绑定 4 态渲染顺序（TimelineSteps 用） */
export const BINDING_STEPS: Array<{ status: string; label: string }> = [
  { status: 'PENDING_CONFIRM', label: '待确认' },
  { status: 'ACTIVE', label: '生效中' },
  { status: 'PENDING_RELEASE', label: '待解除' },
  { status: 'RELEASED', label: '已解除' },
];

/** 动作键 → 目标状态映射（applyTransition 与页面共用，避免各写一份） */
export const ACTION_TARGET: Record<string, Partial<Record<MachineKey, string>>> = {
  // 工单
  accept: { WORK_ORDER: 'IN_PROGRESS' },
  cancel: { WORK_ORDER: 'CLOSED' },
  submitFeedback: { WORK_ORDER: 'PENDING_CONFIRM' },
  reject: { WORK_ORDER: 'IN_PROGRESS', ONBOARDING: 'REJECTED' },
  rate: { WORK_ORDER: 'COMPLETED' },
  archive: { WORK_ORDER: 'CLOSED' },
  // 入驻
  submit: { ONBOARDING: 'PENDING_PRIMARY' },
  passPrimary: { ONBOARDING: 'PENDING_SECONDARY' },
  returnBack: { ONBOARDING: 'RECTIFY' },
  markRectify: { ONBOARDING: 'RECTIFY' },
  passSecondary: { ONBOARDING: 'TRIAL' },
  confirmActive: { ONBOARDING: 'ACTIVE' },
  resubmit: { ONBOARDING: 'PENDING_SECONDARY' },
  restart: { ONBOARDING: 'DRAFT' },
  // 告警
  confirmAlarm: { ALARM: 'CONFIRMED' },
  process: { ALARM: 'PROCESSING' },
  recover: { ALARM: 'RECOVERED' },
  // 绑定
  confirmBinding: { BINDING: 'ACTIVE' },
  rejectBinding: { BINDING: 'RELEASED' },
  requestRelease: { BINDING: 'PENDING_RELEASE' },
  confirmRelease: { BINDING: 'RELEASED' },
  cancelRelease: { BINDING: 'ACTIVE' },
};

/**
 * 仅追加时间轴、不改变主状态的动作
 * 这类动作不走 canTransition 校验，由 applyTransition 特判放行
 */
export const TIMELINE_ONLY_ACTIONS: Partial<Record<MachineKey, string[]>> = {
  WORK_ORDER: ['addProgress', 'rate', 'dispute'],
};

/** 页面按钮键 → applyTransition 的动作键映射（消除同键不同义） */
export const ACTION_KEY_ALIAS: Record<MachineKey, Record<string, string>> = {
  WORK_ORDER: { rate: 'rate', dispute: 'dispute' },
  ONBOARDING: { reject: 'reject' },
  ALARM: { confirm: 'confirmAlarm' },
  BINDING: { confirm: 'confirmBinding', reject: 'rejectBinding' },
};

/**
 * 解析动作键对应的目标状态
 * @param key 机器键
 * @param action 动作键
 * @returns 目标状态；无对应迁移时返回 null
 */
export function targetOf(key: MachineKey, action: string): string | null {
  const resolved = ACTION_KEY_ALIAS[key]?.[action] ?? action;
  return ACTION_TARGET[resolved]?.[key] ?? null;
}