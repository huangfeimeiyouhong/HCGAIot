/**
 * 三入口菜单定义 —— 侧边栏唯一真源（SideNav 渲染，guard 校验）
 * ⚠️ 改页面需同步：router/routes.<entry>.ts + 本文件（约定 6 / S2）
 */
import type { Role, VendorType } from '@/types';

/** 菜单项 */
export interface MenuItem {
  /** 路由 path */
  path: string;
  /** 菜单标题 */
  title: string;
  /** @element-plus/icons-vue 组件名 */
  icon: string;
  /** 排序，越小越靠前 */
  order: number;
  /** 需要的厂家类型；不设则两种厂家都可见 */
  vendorType?: VendorType;
  /** 未入驻厂家是否可见（仅工作台与入驻申请为 true） */
  visibleWhenUnbound?: boolean;
}

/** 菜单分组 */
export interface MenuGroup {
  key: string;
  role: Role;
  title: string;
  items: MenuItem[];
}

/** 平台方 17 项 */
const PLATFORM_ITEMS: MenuItem[] = [
  { path: '/platform/dashboard', title: '平台总览', icon: 'Odometer', order: 1 },
  { path: '/platform/review/applications', title: '入驻审核', icon: 'DocumentChecked', order: 2 },
  { path: '/platform/tenants', title: '租户管理', icon: 'OfficeBuilding', order: 3 },
  { path: '/platform/devices', title: '设备台账', icon: 'Cpu', order: 4 },
  { path: '/platform/bindings', title: '绑定关系', icon: 'Connection', order: 5 },
  { path: '/platform/alarms', title: '告警中心', icon: 'Bell', order: 6 },
  { path: '/platform/work-orders', title: '工单管理', icon: 'Tickets', order: 7 },
  { path: '/platform/disputes', title: '争议仲裁', icon: 'Stamp', order: 8 },
  { path: '/platform/vendor-performance', title: '履约考核', icon: 'TrendCharts', order: 9 },
  { path: '/platform/notifications', title: '通知中心', icon: 'Message', order: 10 },
  { path: '/platform/audit-logs', title: '审计日志', icon: 'Finished', order: 11 },
  { path: '/platform/settings/alarm-rules', title: '告警规则配置', icon: 'SetUp', order: 12 },
  { path: '/platform/settings/sla', title: 'SLA 时限配置', icon: 'Timer', order: 13 },
  { path: '/platform/screen', title: '总览大屏', icon: 'Monitor', order: 14 },
];

/** 厂家端 15 项 */
const VENDOR_ITEMS: MenuItem[] = [
  { path: '/vendor/dashboard', title: '厂家工作台', icon: 'Odometer', order: 1, visibleWhenUnbound: true },
  { path: '/vendor/onboarding', title: '入驻申请', icon: 'DocumentAdd', order: 2, visibleWhenUnbound: true },
  { path: '/vendor/models', title: '产品型号档案', icon: 'Files', order: 3, vendorType: 'COOKWARE' },
  { path: '/vendor/devices', title: '设备清单', icon: 'Cpu', order: 4 },
  { path: '/vendor/bindings', title: '绑定关系', icon: 'Connection', order: 5 },
  { path: '/vendor/usage', title: '设备使用情况', icon: 'DataLine', order: 6 },
  { path: '/vendor/alarms', title: '告警中心', icon: 'Bell', order: 7 },
  { path: '/vendor/alarm-stats', title: '告警统计', icon: 'PieChart', order: 8 },
  { path: '/vendor/work-orders', title: '工单处理', icon: 'Tickets', order: 9 },
  { path: '/vendor/components', title: '部件台账', icon: 'Cpu', order: 10, vendorType: 'IOT' },
  { path: '/vendor/accounts', title: '子账号管理', icon: 'User', order: 11 },
  { path: '/vendor/notifications', title: '通知中心', icon: 'Message', order: 12 },
  { path: '/vendor/performance', title: '履约画像', icon: 'TrendCharts', order: 13 },
];

/** 客户端 13 项 */
const CUSTOMER_ITEMS: MenuItem[] = [
  { path: '/customer/dashboard', title: '客户工作台', icon: 'Odometer', order: 1 },
  { path: '/customer/devices', title: '我的设备', icon: 'Cpu', order: 2 },
  { path: '/customer/alarms', title: '告警中心', icon: 'Bell', order: 3 },
  { path: '/customer/work-orders', title: '报修工单', icon: 'Tickets', order: 4 },
  { path: '/customer/bindings', title: '绑定确认', icon: 'Connection', order: 5 },
  { path: '/customer/vendors', title: '厂家服务评价', icon: 'Star', order: 6 },
  { path: '/customer/thresholds', title: '阈值设置', icon: 'Odometer', order: 7 },
  { path: '/customer/accounts', title: '子账号管理', icon: 'User', order: 8 },
  { path: '/customer/notifications', title: '通知中心', icon: 'Message', order: 9 },
];

/** 全部菜单分组 */
export const MENUS: MenuGroup[] = [
  { key: 'platform', role: 'PLATFORM', title: '平台运营', items: PLATFORM_ITEMS },
  { key: 'vendor', role: 'VENDOR', title: '厂家中心', items: VENDOR_ITEMS },
  { key: 'customer', role: 'CUSTOMER', title: '客户中心', items: CUSTOMER_ITEMS },
];

/** 菜单过滤入参 */
export interface MenuFilter {
  role: Role;
  vendorType?: VendorType | null;
  /** 厂家是否已入驻（未入驻只显示工作台 + 入驻申请） */
  isBoundVendor?: boolean;
  /** 是否试运营（隐藏履约画像，无考核数据） */
  isTrialVendor?: boolean;
}

/**
 * 按角色 + 厂家类型 + 入驻状态过滤菜单
 * @param filter 过滤条件
 * @returns 排序后的菜单项
 */
export function visibleMenus(filter: MenuFilter): MenuItem[] {
  const group = MENUS.find((g) => g.role === filter.role);
  if (!group) return [];
  const isVendor = filter.role === 'VENDOR';
  return group.items
    .filter((item) => {
      if (isVendor && filter.vendorType && item.vendorType && item.vendorType !== filter.vendorType) return false;
      if (isVendor && filter.isBoundVendor === false && !item.visibleWhenUnbound) return false;
      if (isVendor && filter.isTrialVendor && item.path === '/vendor/performance') return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);
}