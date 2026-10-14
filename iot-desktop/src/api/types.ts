/**
 * API 层公共类型 —— 所有列表方法的统一契约
 */
import type {
  AlarmLevel,
  AlarmSource,
  AlarmStatus,
  BindingStatus,
  BindingType,
  DeviceCategory,
  DeviceStatus,
  NotifyType,
  OnboardingStatus,
  Priority,
  TenantStatus,
  VendorType,
  WorkOrderStatus,
} from '@/types';

/** 列表分页基类 */
export interface ListQuery {
  page: number;
  pageSize: number;
}

/** 带筛选与排序的列表查询 */
export interface PageQuery extends ListQuery {
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 设备列表查询 */
export interface DeviceQuery extends PageQuery {
  category?: DeviceCategory;
  status?: DeviceStatus;
  modelCode?: string;
  vendorId?: string;
  ownerCustomerId?: string;
}

/** 告警列表查询 */
export interface AlarmQuery extends PageQuery {
  level?: AlarmLevel;
  status?: AlarmStatus;
  source?: AlarmSource;
  deviceSn?: string;
  vendorId?: string;
  dateRange?: [string, string];
}

/** 工单列表查询 */
export interface WorkOrderQuery extends PageQuery {
  status?: WorkOrderStatus;
  priority?: Priority;
  slaTimeout?: boolean;
  vendorId?: string;
}

/** 绑定列表查询 */
export interface BindingQuery extends PageQuery {
  status?: BindingStatus;
  type?: BindingType;
  vendorId?: string;
  customerId?: string;
}

/** 入驻申请列表查询 */
export interface ApplicationQuery extends PageQuery {
  status?: OnboardingStatus;
  vendorType?: VendorType;
}

/** 租户列表查询 */
export interface TenantQuery extends PageQuery {
  type?: string;
  status?: TenantStatus;
  auditStatus?: OnboardingStatus;
}

/** 通知列表查询 */
export interface NotificationQuery extends PageQuery {
  type?: NotifyType;
  isRead?: boolean;
}

/** 审计日志列表查询 */
export interface AuditQuery extends PageQuery {
  action?: string;
  operator?: string;
  dateRange?: [string, string];
}

/** 入驻状态流转动作键 */
export type OnboardingAction =
  | 'submit' | 'passPrimary' | 'returnBack' | 'markRectify'
  | 'passSecondary' | 'resubmit' | 'restart' | 'confirmActive' | 'reject';

/** 告警状态流转动作键 */
export type AlarmAction = 'confirm' | 'process' | 'recover';

/** 绑定状态流转动作键 */
export type BindingAction =
  | 'confirm' | 'reject' | 'requestRelease' | 'confirmRelease' | 'cancelRelease';

/** 工单状态流转动作键 */
export type WorkOrderAction =
  | 'accept' | 'cancel' | 'addProgress' | 'submitFeedback'
  | 'reject' | 'rate' | 'archive' | 'dispute';

/** 平台总览返回 */
export interface PlatformOverview {
  kpis: import('@/types').StatCardData[];
  todoList: import('@/types').TodoItem[];
}