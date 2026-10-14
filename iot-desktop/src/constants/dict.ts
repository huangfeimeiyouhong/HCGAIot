/**
 * 业务字典 —— 下拉选项与中文名映射
 * 页面筛选项直接取这里的 options，避免各页面硬编码
 */
import type { DictOption } from '@/types';

/** 设备品类 */
export const DEVICE_CATEGORY_OPTIONS: DictOption[] = [
  { label: '烹饪设备', value: 'COOKING' },
  { label: '制冷设备', value: 'REFRIGERATION' },
  { label: '洗消设备', value: 'WASHING' },
  { label: '排烟设备', value: 'EXHAUST' },
  { label: '消毒设备', value: 'DISINFECTION' },
];

export const DEVICE_CATEGORY_LABEL: Record<string, string> = {
  COOKING: '烹饪设备',
  REFRIGERATION: '制冷设备',
  WASHING: '洗消设备',
  EXHAUST: '排烟设备',
  DISINFECTION: '消毒设备',
};

/** 设备品类缩写（SN 规则用） */
export const DEVICE_CATEGORY_ABBR: Record<string, string> = {
  COOKING: 'CK',
  REFRIGERATION: 'RF',
  WASHING: 'WS',
  EXHAUST: 'EX',
  DISINFECTION: 'DS',
};

/** 问题类型 */
export const PROBLEM_TYPE_OPTIONS: DictOption[] = [
  { label: '设备故障', value: 'DEVICE_FAULT' },
  { label: '部件故障', value: 'PART_FAULT' },
  { label: '参数异常', value: 'PARAM_ABNORMAL' },
  { label: '咨询协助', value: 'CONSULT' },
  { label: '其他', value: 'OTHER' },
];

export const PROBLEM_TYPE_LABEL: Record<string, string> = {
  DEVICE_FAULT: '设备故障',
  PART_FAULT: '部件故障',
  PARAM_ABNORMAL: '参数异常',
  CONSULT: '咨询协助',
  OTHER: '其他',
};

/** 工单优先级 */
export const PRIORITY_OPTIONS: DictOption[] = [
  { label: '紧急', value: 'URGENT' },
  { label: '高', value: 'HIGH' },
  { label: '中', value: 'NORMAL' },
  { label: '低', value: 'LOW' },
];

/** 告警类型（12 种） */
export const ALARM_TYPE_OPTIONS: DictOption[] = [
  { label: '超温', value: '超温' },
  { label: '温度过低', value: '温度过低' },
  { label: '燃气泄漏', value: '燃气泄漏' },
  { label: '断电', value: '断电' },
  { label: '离线', value: '离线' },
  { label: '电压异常', value: '电压异常' },
  { label: '电流异常', value: '电流异常' },
  { label: '水位异常', value: '水位异常' },
  { label: '风机异常', value: '风机异常' },
  { label: '数据缺失', value: '数据缺失' },
  { label: '部件故障', value: '部件故障' },
  { label: '其他异常', value: '其他异常' },
];

/** 告警类型 → 指标键与单位（mock 与图表共用） */
export const ALARM_METRIC_MAP: Record<string, { metric: string; unit: string; base: number }> = {
  超温: { metric: 'temperature', unit: '℃', base: 8 },
  温度过低: { metric: 'temperature', unit: '℃', base: 2 },
  燃气泄漏: { metric: 'gasConcentration', unit: '%LEL', base: 0.1 },
  断电: { metric: 'voltage', unit: 'V', base: 220 },
  离线: { metric: 'online', unit: '', base: 1 },
  电压异常: { metric: 'voltage', unit: 'V', base: 220 },
  电流异常: { metric: 'current', unit: 'A', base: 18 },
  水位异常: { metric: 'waterLevel', unit: '%', base: 50 },
  风机异常: { metric: 'fanSpeed', unit: 'rpm', base: 1400 },
  数据缺失: { metric: 'reportRate', unit: '%', base: 95 },
  部件故障: { metric: 'voltage', unit: 'V', base: 220 },
  其他异常: { metric: 'temperature', unit: '℃', base: 8 },
};

/** 通知类型 */
export const NOTIFY_TYPE_OPTIONS: DictOption[] = [
  { label: 'SLA 超时', value: 'SLA_TIMEOUT' },
  { label: '审核结果', value: 'AUDIT_RESULT' },
  { label: '争议通知', value: 'DISPUTE' },
  { label: '系统公告', value: 'SYSTEM' },
  { label: '工单进展', value: 'ORDER_PROGRESS' },
  { label: '绑定确认', value: 'BINDING_CONFIRM' },
  { label: '告警提醒', value: 'ALARM_REMIND' },
];

export const NOTIFY_TYPE_LABEL: Record<string, string> = {
  SLA_TIMEOUT: 'SLA 超时',
  AUDIT_RESULT: '审核结果',
  DISPUTE: '争议通知',
  SYSTEM: '系统公告',
  ORDER_PROGRESS: '工单进展',
  BINDING_CONFIRM: '绑定确认',
  ALARM_REMIND: '告警提醒',
};

/** 绑定类型 */
export const BINDING_TYPE_OPTIONS: DictOption[] = [
  { label: '产权绑定', value: 'OWNERSHIP' },
  { label: '装配绑定', value: 'ASSEMBLY' },
];

export const BINDING_TYPE_LABEL: Record<string, string> = {
  OWNERSHIP: '产权绑定',
  ASSEMBLY: '装配绑定',
};

/** 绑定来源 */
export const BINDING_SOURCE_LABEL: Record<string, string> = {
  VENDOR_DECLARE: '厂家申报',
  PLATFORM_IMPORT: '平台导入',
  AUTO_CONFIRM: '超时自动确认',
};

/** 审计动作 */
export const AUDIT_ACTION_OPTIONS: DictOption[] = [
  { label: '账号管理', value: 'ACCOUNT_MANAGE' },
  { label: '绑定变更', value: 'BINDING_CHANGE' },
  { label: '数据导出', value: 'DATA_EXPORT' },
  { label: '工单处理', value: 'ORDER_HANDLE' },
];

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  ACCOUNT_MANAGE: '账号管理',
  BINDING_CHANGE: '绑定变更',
  DATA_EXPORT: '数据导出',
  ORDER_HANDLE: '工单处理',
};

/** 争议类型 */
export const DISPUTE_TYPE_OPTIONS: DictOption[] = [
  { label: 'SLA 超时责任', value: 'SLA 超时责任' },
  { label: '备件费用争议', value: '备件费用争议' },
  { label: '维修质量争议', value: '维修质量争议' },
  { label: '数据真实性争议', value: '数据真实性争议' },
  { label: '其他', value: '其他' },
];

/** 部件类型 */
export const COMPONENT_TYPE_OPTIONS: DictOption[] = [
  { label: '温度传感器', value: 'TEMP_SENSOR' },
  { label: '燃气传感器', value: 'GAS_SENSOR' },
  { label: '网关', value: 'GATEWAY' },
  { label: '采集器', value: 'ACQUISITION' },
  { label: '电磁阀', value: 'VALVE' },
];

export const COMPONENT_TYPE_LABEL: Record<string, string> = {
  TEMP_SENSOR: '温度传感器',
  GAS_SENSOR: '燃气传感器',
  GATEWAY: '网关',
  ACQUISITION: '采集器',
  VALVE: '电磁阀',
};

/** 客户行业 */
export const CUSTOMER_INDUSTRY_OPTIONS: DictOption[] = [
  { label: '学校食堂', value: 'SCHOOL' },
  { label: '酒店餐饮', value: 'HOTEL' },
  { label: '团餐企业', value: 'GROUP_MEAL' },
  { label: '经销商', value: 'DEALER' },
];

export const CUSTOMER_INDUSTRY_LABEL: Record<string, string> = {
  SCHOOL: '学校食堂',
  HOTEL: '酒店餐饮',
  GROUP_MEAL: '团餐企业',
  DEALER: '经销商',
};

/** 入驻状态筛选（平台端 7 态） */
export const ONBOARDING_STATUS_OPTIONS: DictOption[] = [
  { label: '草稿', value: 'DRAFT' },
  { label: '待初审', value: 'PENDING_PRIMARY' },
  { label: '待复审', value: 'PENDING_SECONDARY' },
  { label: '待整改', value: 'RECTIFY' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '试运营', value: 'TRIAL' },
  { label: '正式入驻', value: 'ACTIVE' },
];

/** 厂家类型 */
export const VENDOR_TYPE_OPTIONS: DictOption[] = [
  { label: '厨具厂家', value: 'COOKWARE' },
  { label: '物联网厂家', value: 'IOT' },
];

export const VENDOR_TYPE_LABEL: Record<string, string> = {
  COOKWARE: '厨具厂家',
  IOT: '物联网厂家',
};

/** 采集指标（告警规则与趋势图共用） */
export const METRIC_OPTIONS: DictOption[] = [
  { label: '温度', value: 'temperature' },
  { label: '燃气浓度', value: 'gasConcentration' },
  { label: '电压', value: 'voltage' },
  { label: '电流', value: 'current' },
  { label: '水位', value: 'waterLevel' },
  { label: '风机转速', value: 'fanSpeed' },
];

/** 指标中文名与单位 */
export const METRIC_LABEL: Record<string, string> = {
  temperature: '温度',
  gasConcentration: '燃气浓度',
  voltage: '电压',
  current: '电流',
  waterLevel: '水位',
  fanSpeed: '风机转速',
  reportRate: '数据上报率',
  online: '在线状态',
};

export const METRIC_UNIT: Record<string, string> = {
  temperature: '℃',
  gasConcentration: '%LEL',
  voltage: 'V',
  current: 'A',
  waterLevel: '%',
  fanSpeed: 'rpm',
  reportRate: '%',
  online: '',
};

/** 条件运算符 */
export const CONDITION_OPTIONS: DictOption[] = [
  { label: '大于', value: 'GT' },
  { label: '大于等于', value: 'GTE' },
  { label: '小于', value: 'LT' },
  { label: '小于等于', value: 'LTE' },
  { label: '等于', value: 'EQ' },
];

export const CONDITION_LABEL: Record<string, string> = {
  GT: '>',
  GTE: '≥',
  LT: '<',
  LTE: '≤',
  EQ: '=',
};

/**
 * 按字典类型取下拉选项
 * @param type 字典类型
 * @returns 选项数组
 */
export function getDict(
  type: 'category' | 'priority' | 'problemType' | 'alarmType' | 'bindingType' | 'vendorType' | 'onboardingStatus' | 'componentType' | 'metric' | 'condition',
): DictOption[] {
  switch (type) {
    case 'category':
      return DEVICE_CATEGORY_OPTIONS;
    case 'priority':
      return PRIORITY_OPTIONS;
    case 'problemType':
      return PROBLEM_TYPE_OPTIONS;
    case 'alarmType':
      return ALARM_TYPE_OPTIONS;
    case 'bindingType':
      return BINDING_TYPE_OPTIONS;
    case 'vendorType':
      return VENDOR_TYPE_OPTIONS;
    case 'onboardingStatus':
      return ONBOARDING_STATUS_OPTIONS;
    case 'componentType':
      return COMPONENT_TYPE_OPTIONS;
    case 'metric':
      return METRIC_OPTIONS;
    case 'condition':
      return CONDITION_OPTIONS;
    default:
      return [];
  }
}