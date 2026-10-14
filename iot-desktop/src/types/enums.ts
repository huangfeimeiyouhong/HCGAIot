/**
 * 枚举（字面量联合类型）—— 全项目唯一真源
 * 依赖方向：types 不 import 任何业务模块（约定 2）
 */

/** 角色 */
export type Role = 'PLATFORM' | 'VENDOR' | 'CUSTOMER';

/** 厂家类型 */
export type VendorType = 'COOKWARE' | 'IOT';

/** 账号角色 */
export type AccountRole =
  | 'PLATFORM_ADMIN' | 'REVIEWER' | 'OPS' | 'DATA_OPS'
  | 'VENDOR_ADMIN' | 'VENDOR_ENGINEER' | 'VENDOR_VIEWER'
  | 'CUSTOMER_ADMIN' | 'CUSTOMER_OPERATOR' | 'CUSTOMER_VIEWER';

/** 入驻申请状态（7 态） */
export type OnboardingStatus =
  | 'DRAFT' | 'PENDING_PRIMARY' | 'PENDING_SECONDARY'
  | 'RECTIFY' | 'REJECTED' | 'TRIAL' | 'ACTIVE';

/** 绑定状态（4 态） */
export type BindingStatus = 'PENDING_CONFIRM' | 'ACTIVE' | 'PENDING_RELEASE' | 'RELEASED';

/** 绑定类型 */
export type BindingType = 'OWNERSHIP' | 'ASSEMBLY';

/** 绑定来源 */
export type BindingSource = 'VENDOR_DECLARE' | 'PLATFORM_IMPORT' | 'AUTO_CONFIRM';

/** 告警状态（4 态） */
export type AlarmStatus = 'UNCONFIRMED' | 'CONFIRMED' | 'PROCESSING' | 'RECOVERED';

/** 告警等级 */
export type AlarmLevel = 'URGENT' | 'IMPORTANT' | 'NORMAL';

/** 告警来源 */
export type AlarmSource = 'VENDOR_RULE' | 'PLATFORM_RULE' | 'CUSTOMER_RULE';

/** 工单状态（5 态） */
export type WorkOrderStatus =
  | 'PENDING_ACCEPT' | 'IN_PROGRESS' | 'PENDING_CONFIRM' | 'COMPLETED' | 'CLOSED';

/** 工单来源 */
export type WorkOrderSource = 'CUSTOMER_REPAIR' | 'ALARM_TRANSFER' | 'VENDOR_INITIATE';

/** 工单优先级 */
export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

/** 问题类型 */
export type ProblemType = 'DEVICE_FAULT' | 'PART_FAULT' | 'PARAM_ABNORMAL' | 'CONSULT' | 'OTHER';

/** 设备状态 */
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ABNORMAL' | 'INACTIVE' | 'REPAIRING';

/** 设备品类 */
export type DeviceCategory = 'COOKING' | 'REFRIGERATION' | 'WASHING' | 'EXHAUST' | 'DISINFECTION';

/** 租户状态 */
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'EXPIRED';

/** 部件类型 */
export type ComponentType = 'TEMP_SENSOR' | 'GAS_SENSOR' | 'GATEWAY' | 'ACQUISITION' | 'VALVE';

/** 通知类型 */
export type NotifyType =
  | 'SLA_TIMEOUT' | 'AUDIT_RESULT' | 'DISPUTE' | 'SYSTEM'
  | 'ORDER_PROGRESS' | 'BINDING_CONFIRM' | 'ALARM_REMIND';

/** 审计动作 */
export type AuditAction = 'ACCOUNT_MANAGE' | 'BINDING_CHANGE' | 'DATA_EXPORT' | 'ORDER_HANDLE';

/** 争议判定 */
export type DisputeVerdict = 'VENDOR_BREACH' | 'CUSTOMER_CAUSE' | 'NEGOTIATED';

/** SLA 升级级别 */
export type EscalationLevel = 0 | 1 | 2 | 3;

/** 租户类型 */
export type TenantType = 'VENDOR' | 'CUSTOMER';

/** 客户行业 */
export type CustomerIndustry = 'SCHOOL' | 'HOTEL' | 'GROUP_MEAL' | 'DEALER';

/** 账号状态 */
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVE' | 'DISABLED';

/** 型号状态 */
export type ModelStatus = 'ACTIVE' | 'DISABLED';

/** 使用活跃度 */
export type ActivityLevel = 'HIGH' | 'NORMAL' | 'LOW' | 'ZOMBIE';

/** 告警规则条件运算符 */
export type RuleCondition = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ';