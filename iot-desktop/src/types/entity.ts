/**
 * 实体接口 —— 22 个 mock 集合的 TS 定义，全项目单一真源
 * 页面 / api / mock 三方都从这里 import；任何页面不得本地定义实体接口
 */
import type {
  AccountRole,
  AccountStatus,
  ActivityLevel,
  AlarmLevel,
  AlarmSource,
  AlarmStatus,
  AuditAction,
  BindingSource,
  BindingStatus,
  BindingType,
  ComponentType,
  CustomerIndustry,
  DeviceCategory,
  DeviceStatus,
  DisputeVerdict,
  EscalationLevel,
  ModelStatus,
  NotifyType,
  OnboardingStatus,
  Priority,
  ProblemType,
  Role,
  RuleCondition,
  TenantStatus,
  TenantType,
  VendorType,
  WorkOrderSource,
  WorkOrderStatus,
} from './enums';

/* ============ M-01 租户 ============ */
export interface Tenant {
  id: string;
  name: string;
  /** 简写，用于表格与图表标签 */
  shortName: string;
  type: TenantType;
  /** 厂家类型（type==='VENDOR' 时有值） */
  vendorType?: VendorType;
  /** 行业分布（type==='CUSTOMER' 时有值） */
  industry?: CustomerIndustry;
  auditStatus: OnboardingStatus;
  status: TenantStatus;
  contact: string;
  contactPhone: string;
  /** 服务范围内的客户 tenantId（仅厂家） */
  serviceScope: string[];
  /** 关联厂家数（仅客户） */
  vendorCount?: number;
  createdAt: string;
  validFrom: string;
  validTo: string;
  /** 合同/结算字段 —— 平台方可见但脱敏为 *** */
  contractNo?: string;
  settlementAccount?: string;
}

/* ============ M-02 账号 ============ */
export interface TenantAccount {
  id: string;
  tenantId: string;
  name: string;
  account: string;
  role: AccountRole;
  status: AccountStatus;
  phone?: string;
  lastLoginAt?: string;
  createdAt: string;
}

/* ============ M-03 入驻申请 ============ */
export interface OnboardingApplication {
  id: string;
  vendorName: string;
  vendorType: VendorType;
  /** 关联厂家租户 id（草稿态可能为 null） */
  tenantId?: string | null;
  status: OnboardingStatus;
  submitTime?: string;
  stayDays: number;
  reviewer?: string;
  /** 主体资质 */
  legalEntity: string;
  licenseNo: string;
  legalPerson: string;
  registeredAddress: string;
  /** 产品能力 */
  productModels: ProductModel[];
  /** 售后能力 */
  engineerCount: number;
  serviceRadius: string;
  hasSpareWarehouse: boolean;
  /** 商务条件 */
  slaCommitment: SlaCommitment;
  /** 技术对接信息（复审阶段填写） */
  techIntegration?: {
    protocol: string;
    fieldMapping: Array<{ source: string; target: string }>;
    note?: string;
  };
  attachments: Attachment[];
  /** 驳回原因 */
  rejectReason?: string;
  /** 整改原因 */
  rectifyReason?: string;
  createdAt: string;
}

/* ============ M-04 流程时间轴（入驻 + 工单共用结构） ============ */
export interface TimelineRecord {
  id: string;
  /** 关联单据 id（applicationId 或 orderCode） */
  bizId: string;
  action: string;
  operator: string;
  operatorRole?: AccountRole;
  time: string;
  remark?: string;
  /** 状态机路径（from → to），用于 TimelineSteps 渲染节点 */
  fromStatus?: string;
  toStatus?: string;
}

/* ============ M-05 产品型号 ============ */
export interface ProductModel {
  id: string;
  modelCode: string;
  name: string;
  category: DeviceCategory;
  params: Record<string, string | number>;
  warrantyMonths: number;
  protocol: string;
  vendorId: string;
  status: ModelStatus;
  createdAt: string;
}

/* ============ M-06 设备实例 ============ */
export interface Device {
  sn: string;
  name: string;
  modelCode: string;
  category: DeviceCategory;
  manufactureDate: string;
  /** 质保期至 —— 系统按型号 warrantyMonths 自动计算 */
  warrantyUntil: string;
  /** 产权归属客户（OWNERSHIP 绑定派生）；无绑定为 null */
  ownerCustomerId: string | null;
  /** 运行状态 */
  status: DeviceStatus;
  /** 关联厂家（装配绑定可能多家） */
  vendorIds: string[];
  location: string;
  /** 累计告警数 */
  alarmCount: number;
  lastReportAt: string;
}

/* ============ M-07 部件（物联网厂家） ============ */
export interface Component {
  id: string;
  componentSn: string;
  type: ComponentType;
  firmwareVersion: string;
  metricSet: string[];
  deviceSn: string;
  vendorId: string;
  batch: string;
  dataMissingRate: number;
}

/* ============ M-08 绑定关系 ============ */
export interface Binding {
  id: string;
  deviceSn: string;
  customerId: string;
  vendorId: string;
  type: BindingType;
  source: BindingSource;
  effectiveFrom: string;
  effectiveTo?: string;
  status: BindingStatus;
  operator: string;
  /** 是否超时自动确认（7 天） */
  autoConfirmed: boolean;
  /** 申报时间（用于 7 天倒计时） */
  declaredAt?: string;
  /** 自动确认截止时间 */
  autoConfirmDeadline?: string;
  /** 拒绝原因 */
  rejectReason?: string;
}

/* ============ M-09 绑定变更历史（append-only） ============ */
export interface BindingHistory {
  id: string;
  bindingId: string;
  version: number;
  action: string;
  operator: string;
  time: string;
  reason: string;
}

/* ============ M-10 告警 ============ */
export interface Alarm {
  id: string;
  deviceSn: string;
  customerId: string;
  vendorId: string;
  level: AlarmLevel;
  type: string;
  source: AlarmSource;
  ruleId?: string;
  threshold: number;
  actualValue: number;
  unit: string;
  /** 持续时长（秒） */
  duration: number;
  triggerTime: string;
  status: AlarmStatus;
  componentSn?: string;
  /** 关联工单（告警转单后回填） */
  orderId?: string;
  /** 客户自定义阈值触发 —— 不计入厂家 SLA 考核 */
  byCustomerThreshold?: boolean;
}

/* ============ M-11 工单 ============ */
export interface WorkOrder {
  code: string;
  source: WorkOrderSource;
  deviceSn: string;
  alarmId?: string;
  vendorId: string;
  customerId: string;
  problemType: ProblemType;
  description: string;
  priority: Priority;
  /** SLA 三段时限（小时），从 constants/sla.ts 按优先级取默认值后写入快照 */
  sla: SlaCommitment;
  status: WorkOrderStatus;
  /** SLA 截止时间（createdAt + sla.handleHours） */
  deadlineAt: string;
  rejectCount: number;
  disputeFlag: boolean;
  rating?: { score: number; comment: string; ratedAt: string };
  createdAt: string;
  /** 完成时间（COMPLETED 时写入，供 7 天归档判定） */
  completedAt?: string;
  /** 三级升级提示 */
  escalationLevel: EscalationLevel;
  /** 接单说明 */
  acceptRemark?: string;
  /** 预计到场时间 */
  etaAt?: string;
  /** 现场照片（附件占位） */
  attachments?: Attachment[];
}

/* ============ SlaCommitment ============ */
export interface SlaCommitment {
  /** 接单时限（小时） */
  acceptHours: number;
  /** 处理时限（小时） */
  handleHours: number;
  /** 待验收时限（小时） */
  confirmHours: number;
}

/* ============ M-13 备件记录 ============ */
export interface SparePart {
  id: string;
  orderCode: string;
  name: string;
  spec: string;
  quantity: number;
  sn?: string;
  oldPartRecycled: boolean;
  oldPartDestination?: string;
  createdAt: string;
}

/* ============ 工单进展记录 ============ */
export interface ProgressRecord {
  id: string;
  orderCode: string;
  content: string;
  operator: string;
  time: string;
  attachments: Attachment[];
}

/* ============ M-14 设备监控数据 ============ */
export interface DeviceMetricPoint {
  deviceSn: string;
  metricKey: string;
  value: number;
  time: string;
}

/* ============ M-15 站内信 ============ */
export interface Notification {
  id: string;
  tenantId: string;
  type: NotifyType;
  title: string;
  content: string;
  isRead: boolean;
  /** 关联单据类型 + id，用于「跳转关联单据」 */
  refType?: 'ORDER' | 'ALARM' | 'APPLICATION' | 'BINDING' | 'DISPUTE';
  refId?: string;
  createdAt: string;
}

/* ============ M-16 审计日志 ============ */
export interface AuditLog {
  id: string;
  operator: string;
  tenantId: string;
  action: AuditAction;
  target: string;
  before: string;
  after: string;
  ip: string;
  time: string;
}

/* ============ M-17 告警规则 ============ */
export interface AlarmRule {
  id: string;
  name: string;
  category: DeviceCategory | 'ALL';
  metric: string;
  condition: RuleCondition;
  threshold: number;
  level: AlarmLevel;
  notifyTargets: string[];
  enabled: boolean;
  updatedAt: string;
}

/* ============ M-18 SLA 配置 ============ */
export interface SlaConfigRow extends SlaCommitment {
  priority: Priority;
}

/* ============ M-19 争议 ============ */
export interface Dispute {
  id: string;
  orderCode: string;
  raisedBy: 'CUSTOMER' | 'VENDOR';
  type: string;
  evidence: Array<{ side: 'CUSTOMER' | 'VENDOR' | 'PLATFORM'; fileName: string; time: string }>;
  slaJudgement: string;
  verdict?: DisputeVerdict;
  verdictNote?: string;
  verdictTime?: string;
  operator?: string;
  createdAt: string;
}

/* ============ M-20 履约统计 ============ */
export interface VendorSlaStat {
  vendorId: string;
  /** 季度，如 2026Q1 */
  quarter: string;
  onTimeAcceptRate: number;
  onTimeHandleRate: number;
  passRate: number;
  avgResponseHours: number;
  avgConfirmHours: number;
  breachCount: number;
}

/* ============ M-21 使用情况 ============ */
export interface UsageStat {
  deviceSn: string;
  onlineRate: number;
  runtimePerDay: number;
  startStopFreq: number;
  alarmFreq: number;
  /** 故障间隔（小时） */
  mtbf: number;
  activityLevel: ActivityLevel;
}

/* ============ M-22 客户自定义阈值 ============ */
export interface CustomerThreshold {
  id: string;
  tenantId: string;
  deviceSn: string;
  metricKey: string;
  threshold: number;
  level: AlarmLevel;
  enabled: boolean;
}

/* ============ 附件 ============ */
export interface Attachment {
  id: string;
  name: string;
  category: 'LICENSE' | 'PRODUCT' | 'MATERIAL' | 'SITE_PHOTO' | 'OTHER';
  /** 字节数 */
  size: number;
}

/* ============ 会话用户 ============ */
export interface SessionUser {
  account: string;
  displayName: string;
  role: Role;
  accountRole: AccountRole;
  tenantId: string | null;
  tenantName: string;
  vendorId: string | null;
  vendorType: VendorType | null;
  /** 厂家入驻状态（客户/平台为 null） */
  onboardingStatus: OnboardingStatus | null;
}

/** 登录结果 */
export interface LoginResult {
  token: string;
  user: SessionUser;
}