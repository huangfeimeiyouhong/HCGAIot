/**
 * 厂家端路由（16 条）—— 挂在 AppLayout 下，meta.role = 'VENDOR'
 * /vendor/models 限厨具厂家，/vendor/components 限物联网厂家（守卫 + 侧栏双保险）
 */
import AppLayout from '@/components/layout/AppLayout.vue';

import type { RouteRecordRaw } from 'vue-router';

export const vendorRoutes: RouteRecordRaw[] = [
  {
    path: '/vendor',
    component: AppLayout,
    redirect: '/vendor/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'VendorDashboard',
        component: () => import('@/views/vendor/dashboard/index.vue'),
        meta: { title: '厂家工作台', role: 'VENDOR', icon: 'Odometer', order: 1, keepAlive: true },
      },
      {
        path: 'onboarding',
        name: 'VendorOnboarding',
        component: () => import('@/views/vendor/onboarding/index.vue'),
        // 未入驻厂家也要能进入（PRD 明确落地页）
        meta: { title: '入驻申请', role: 'VENDOR', icon: 'DocumentAdd', order: 2, public: true },
      },
      {
        path: 'models',
        name: 'VendorModels',
        component: () => import('@/views/vendor/models/model-list.vue'),
        meta: { title: '产品型号档案', role: 'VENDOR', icon: 'Files', order: 3, vendorType: 'COOKWARE' },
      },
      {
        path: 'devices',
        name: 'VendorDevices',
        component: () => import('@/views/vendor/devices/device-list.vue'),
        meta: { title: '设备清单', role: 'VENDOR', icon: 'Cpu', order: 4, keepAlive: true },
      },
      {
        path: 'devices/:id',
        name: 'VendorDeviceDetail',
        component: () => import('@/views/vendor/devices/device-detail.vue'),
        meta: { title: '设备详情', role: 'VENDOR', parent: '/vendor/devices' },
      },
      {
        path: 'bindings',
        name: 'VendorBindings',
        component: () => import('@/views/vendor/bindings/binding-list.vue'),
        meta: { title: '绑定关系', role: 'VENDOR', icon: 'Connection', order: 5, keepAlive: true },
      },
      {
        path: 'usage',
        name: 'VendorUsage',
        component: () => import('@/views/vendor/usage/usage-analysis.vue'),
        meta: { title: '设备使用情况', role: 'VENDOR', icon: 'DataLine', order: 6 },
      },
      {
        path: 'alarms',
        name: 'VendorAlarms',
        component: () => import('@/views/vendor/alarms/alarm-center.vue'),
        meta: { title: '告警中心', role: 'VENDOR', icon: 'Bell', order: 7, keepAlive: true },
      },
      {
        path: 'alarms/:id',
        name: 'VendorAlarmDetail',
        component: () => import('@/views/vendor/alarms/alarm-detail.vue'),
        meta: { title: '告警详情', role: 'VENDOR', parent: '/vendor/alarms' },
      },
      {
        path: 'alarm-stats',
        name: 'VendorAlarmStats',
        component: () => import('@/views/vendor/alarm-stats/index.vue'),
        meta: { title: '告警统计', role: 'VENDOR', icon: 'PieChart', order: 8 },
      },
      {
        path: 'work-orders',
        name: 'VendorWorkOrders',
        component: () => import('@/views/vendor/work-orders/order-list.vue'),
        meta: { title: '工单处理', role: 'VENDOR', icon: 'Tickets', order: 9, keepAlive: true },
      },
      {
        path: 'work-orders/:id',
        name: 'VendorWorkOrderDetail',
        component: () => import('@/views/vendor/work-orders/order-detail.vue'),
        meta: { title: '工单详情', role: 'VENDOR', parent: '/vendor/work-orders' },
      },
      {
        path: 'components',
        name: 'VendorComponents',
        component: () => import('@/views/vendor/components/component-list.vue'),
        meta: { title: '部件台账', role: 'VENDOR', icon: 'Cpu', order: 10, vendorType: 'IOT' },
      },
      {
        path: 'accounts',
        name: 'VendorAccounts',
        component: () => import('@/views/vendor/accounts/account-list.vue'),
        meta: { title: '子账号管理', role: 'VENDOR', icon: 'User', order: 11 },
      },
      {
        path: 'notifications',
        name: 'VendorNotifications',
        component: () => import('@/views/vendor/notifications/index.vue'),
        meta: { title: '通知中心', role: 'VENDOR', icon: 'Message', order: 12 },
      },
      {
        path: 'performance',
        name: 'VendorPerformance',
        component: () => import('@/views/vendor/performance/index.vue'),
        meta: { title: '履约画像', role: 'VENDOR', icon: 'TrendCharts', order: 13 },
      },
    ],
  },
];