/**
 * mock 层内部共享类型
 */
import type { Role, VendorType } from '@/types';

/** 随机工具集（由 random.ts 的 createRandom 返回） */
export interface Random {
  /** 下一个 [0,1) 浮点数 */
  next: () => number;
  /** 闭区间随机整数 */
  int: (min: number, max: number) => number;
  /** 区间随机小数，保留 digits 位 */
  float: (min: number, max: number, digits?: number) => number;
  /** 从数组取一个元素 */
  pick: <T>(arr: readonly T[]) => T;
  /** 按权重取样 */
  weighted: <T>(items: Array<{ value: T; weight: number }>) => T;
  /** 概率命中 */
  bool: (probability?: number) => boolean;
  /** 最近 N 天内的随机 ISO 时间串 */
  date: (withinDays: number) => string;
  /** 最近 N 天内的随机毫秒时间戳 */
  timestamp: (withinDays: number) => number;
  /** 左补零 */
  pad: (value: number, len?: number) => string;
  /** 洗牌（不改原数组） */
  shuffle: <T>(arr: readonly T[]) => T[];
}

/** 租户范围（数据隔离的唯一载体，由 resolveScope 产出） */
export interface Scope {
  role: Role;
  /** 平台方为 null；客户为自身 tenantId；厂家为自身 vendorId 对应的 tenantId */
  tenantId: string | null;
  /** 仅厂家 */
  vendorId: string | null;
  /** 仅厂家 —— 决定菜单差异与「部件台账」可见性 */
  vendorType: VendorType | null;

  /** 可见设备 SN 集合；null = 不限（平台方） */
  visibleDeviceSns: Set<string> | null;
  /** 可见客户 ID 集合；null = 不限 */
  visibleCustomerIds: Set<string> | null;
  /** 可见厂家 ID 集合；null = 不限 */
  visibleVendorIds: Set<string> | null;

  /** 需要脱敏为 *** 的字段名 */
  maskFields: string[];
  /** 需完全裁剪的字段 */
  stripFields: string[];
  /** 顶栏数据范围文案 */
  badgeText: string;
}

/** 状态流转入参 */
export interface TransitionOptions {
  collection: 'onboardingApplications' | 'workOrders' | 'alarms' | 'bindings';
  /** 单据 id（工单为 code，其余为 id） */
  id: string;
  /** 目标状态 */
  to: string;
  /** 动作键 */
  action: string;
  /** 操作人 */
  operator: string;
  operatorRole?: import('@/types').AccountRole;
  /** 备注 / 原因 */
  remark?: string;
  /** 额外字段补丁 */
  patch?: Record<string, unknown>;
  /** 时间戳（测试注入用，默认当前时间） */
  time?: string;
}