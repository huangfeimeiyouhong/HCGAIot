/**
 * 视图对象（VO）—— 页面直接消费的类型
 * 依赖方向：vo 依赖 entity/enums，不被 entity 反向依赖
 */
import type { AlarmLevel, Priority, Role } from './enums';
import type { Attachment, TimelineRecord } from './entity';

/** 分页结果（所有列表 api 的统一返回结构） */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** KPI 卡数据 */
export interface StatCardData {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  /** 环比，正=上升 */
  trend?: number;
  /** 语义色，默认中性 */
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  /** 点击跳转路径 */
  to?: string;
}

/** 图表系列数据项 */
export interface ChartSeriesData {
  name: string;
  value: number;
  extra?: Record<string, unknown>;
}

/** 待办项 */
export interface TodoItem {
  id: string;
  label: string;
  count: number;
  /** 点击跳转路径 */
  to: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

/** 状态徽标色调（9 组，对应 variables.scss 的 18 个徽标变量） */
export type StatusTone =
  | 'waiting' | 'trial' | 'success' | 'processing'
  | 'confirm' | 'closed' | 'reject' | 'info' | 'notice';

/** 状态机动作定义 */
export interface StateAction {
  key: string;
  label: string;
  tone: 'primary' | 'success' | 'danger' | 'warning';
  /** 二次确认配置 */
  confirm?: { title: string; requireReason: boolean };
  /** 可执行该动作的角色 */
  roles: Role[];
}

/** 状态机节点定义 */
export interface StateNode {
  label: string;
  actions: StateAction[];
}

/** 时间轴渲染用节点 */
export interface TimelineStep {
  status: string;
  label: string;
}

/** 筛选状态（列表页通用） */
export interface FilterState {
  keyword?: string;
  [key: string]: unknown;
}

/** 审核检查项 */
export interface AuditChecklistItem {
  key: string;
  /** 维度名 */
  dimension: string;
  label: string;
  passed: boolean;
  /** 审核意见 */
  comment?: string;
}

/** 设备详情聚合（平台/厂家侧） */
export interface DeviceDetailBundle {
  device: import('./entity').Device;
  components: import('./entity').Component[];
  bindings: import('./entity').Binding[];
  alarms: import('./entity').Alarm[];
  workOrders: import('./entity').WorkOrder[];
}

/** 客户视角设备（聚合形态，无固件/成本/部件明细） */
export interface CustomerDeviceView {
  sn: string;
  name: string;
  category: import('./enums').DeviceCategory;
  modelCode: string;
  modelName: string;
  vendorName: string;
  vendorId: string;
  location: string;
  /** 综合状态：在线/离线/异常/维修中 */
  status: import('./enums').DeviceStatus;
  /** 告警状态：有未确认告警 / 无告警 */
  alarmStatus: 'HAS_ALARM' | 'NORMAL';
  alarmCount: number;
  lastReportAt: string;
  warrantyUntil: string;
}

/** 工单列表行（客户视角，含设备与厂家名） */
export interface CustomerOrderView {
  code: string;
  status: import('./enums').WorkOrderStatus;
  priority: Priority;
  deviceSn: string;
  deviceName: string;
  vendorName: string;
  createdAt: string;
  deadlineAt: string;
  escalationLevel: import('./enums').EscalationLevel;
}

/** 待确认绑定（客户视角，含倒计时信息） */
export interface PendingBindingView {
  id: string;
  deviceSn: string;
  deviceName: string;
  deviceModel: string;
  vendorId: string;
  vendorName: string;
  type: import('./enums').BindingType;
  declaredBy: string;
  declaredAt: string;
  autoConfirmDeadline: string;
  /** 剩余天数（向下取整，最小 0） */
  remainDays: number;
}

/** 导入错误行 */
export interface ImportErrorRow {
  /** 行号（从 1 开始，数据行，不含表头） */
  rowNo: number;
  sn: string;
  reason: string;
  reasonCode: 'SN_DUPLICATE' | 'MODEL_NOT_FOUND' | 'FIELD_EMPTY' | 'INVALID_DATE';
}

/** 导入解析结果（前端解析文件后传给 api） */
export interface ParsedRows {
  fileName: string;
  rows: Array<Record<string, string>>;
}

/** 批量导入结果 */
export interface ImportResult {
  successCount: number;
  errors: ImportErrorRow[];
}

/** SLA 预览结果 */
export interface SlaPreview {
  priority: Priority;
  label: string;
  commitment: import('./entity').SlaCommitment;
  /** 文案，如「紧急：接单 30 分钟 / 处理 4 小时 / 待验收 24 小时」 */
  text: string;
  alarmLevel?: AlarmLevel;
}

/** 倒计时结果 */
export interface Countdown {
  text: string;
  isTimeout: boolean;
  /** 剩余比例（1 = 未消耗，<=0 = 已超时） */
  ratio: number;
  hours: number;
}

/** 时间轴 + 进展记录的详情页数据包 */
export interface WorkOrderTimelineBundle {
  timeline: TimelineRecord[];
  attachments: Attachment[];
}

/** 下拉选项（字典统一结构） */
export interface DictOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** 允许业务附加字段，便于直接作为下拉项传入 */
  [key: string]: unknown;
}

/** 厂家服务评价（客户视角） */
export interface VendorScoreView {
  vendorId: string;
  vendorName: string;
  avgResponse: number;
  onTimeRate: number;
  myOrderCount: number;
  myRating?: number;
}

/** 设备使用情况 7 指标 */
export interface UsageOverview {
  onlineRate: number;
  runtimePerDay: number;
  startStopFreq: number;
  alarmFreq: number;
  mtbf: number;
  activityDist: ChartSeriesData[];
  componentHealth: number;
}