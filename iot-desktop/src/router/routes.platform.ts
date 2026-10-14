/**
 * 平台方路由（17 条）—— 全部挂在 AppLayout 下，meta.role = 'PLATFORM'
 */
import AppLayout from '@/components/layout/AppLayout.vue';

import type { RouteRecordRaw } from 'vue-router';

export const platformRoutes: RouteRecordRaw[] = [
  {
    path: '/platform',
    component: AppLayout,
    redirect: '/platform/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'PlatformDashboard',
        component: () => import('@/views/platform/dashboard/index.vue'),
        meta: { title: '平台总览', role: 'PLATFORM', icon: 'Odometer', order: 1, keepAlive: true },
      },
      {
        path: 'review/applications',
        name: 'PlatformApplications',
        component: () => import('@/views/platform/review/application-list.vue'),
        meta: { title: '入驻申请', role: 'PLATFORM', icon: 'DocumentChecked', order: 2, keepAlive: true },
      },
      {
        path: 'review/applications/:id',
        name: 'PlatformApplicationDetail',
        component: () => import('@/views/platform/review/application-detail.vue'),
        meta: { title: '入驻审核详情', role: 'PLATFORM', parent: '/platform/review/applications' },
      },
      {
        path: 'tenants',
        name: 'PlatformTenants',
        component: () => import('@/views/platform/tenants/tenant-list.vue'),
        meta: { title: '租户管理', role: 'PLATFORM', icon: 'OfficeBuilding', order: 3, keepAlive: true },
      },
      {
        path: 'tenants/:id',
        name: 'PlatformTenantDetail',
        component: () => import('@/views/platform/tenants/tenant-detail.vue'),
        meta: { title: '租户详情', role: 'PLATFORM', parent: '/platform/tenants' },
      },
      {
        path: 'devices',
        name: 'PlatformDevices',
        component: () => import('@/views/platform/devices/device-list.vue'),
        meta: { title: '设备台账', role: 'PLATFORM', icon: 'Cpu', order: 4, keepAlive: true },
      },
      {
        path: 'bindings',
        name: 'PlatformBindings',
        component: () => import('@/views/platform/bindings/binding-list.vue'),
        meta: { title: '绑定关系', role: 'PLATFORM', icon: 'Connection', order: 5, keepAlive: true },
      },
      {
        path: 'alarms',
        name: 'PlatformAlarms',
        component: () => import('@/views/platform/alarms/alarm-center.vue'),
        meta: { title: '告警中心', role: 'PLATFORM', icon: 'Bell', order: 6, keepAlive: true },
      },
      {
        path: 'work-orders',
        name: 'PlatformWorkOrders',
        component: () => import('@/views/platform/work-orders/order-list.vue'),
        meta: { title: '工单管理', role: 'PLATFORM', icon: 'Tickets', order: 7, keepAlive: true },
      },
      {
        // 只读视角：平台方只有「查看 + 标记争议」权限（PRD Q6），无接单/处理/验收动作
        path: 'work-orders/:id',
        name: 'PlatformWorkOrderDetail',
        component: () => import('@/views/platform/work-orders/order-detail.vue'),
        meta: { title: '工单详情', role: 'PLATFORM', parent: '/platform/work-orders' },
      },
      {
        path: 'disputes',
        name: 'PlatformDisputes',
        component: () => import('@/views/platform/disputes/dispute-list.vue'),
        meta: { title: '争议仲裁', role: 'PLATFORM', icon: 'Stamp', order: 8, keepAlive: true },
      },
      {
        path: 'disputes/:id',
        name: 'PlatformDisputeDetail',
        component: () => import('@/views/platform/disputes/dispute-detail.vue'),
        meta: { title: '仲裁详情', role: 'PLATFORM', parent: '/platform/disputes' },
      },
      {
        path: 'vendor-performance',
        name: 'PlatformPerformance',
        component: () => import('@/views/platform/vendor-performance/index.vue'),
        meta: { title: '履约考核', role: 'PLATFORM', icon: 'TrendCharts', order: 9 },
      },
      {
        path: 'notifications',
        name: 'PlatformNotifications',
        component: () => import('@/views/platform/notifications/index.vue'),
        meta: { title: '通知中心', role: 'PLATFORM', icon: 'Message', order: 10 },
      },
      {
        path: 'audit-logs',
        name: 'PlatformAuditLogs',
        component: () => import('@/views/platform/audit-logs/index.vue'),
        meta: { title: '审计日志', role: 'PLATFORM', icon: 'Finished', order: 11 },
      },
      {
        path: 'settings/alarm-rules',
        name: 'PlatformAlarmRules',
        component: () => import('@/views/platform/settings/alarm-rules.vue'),
        meta: { title: '告警规则配置', role: 'PLATFORM', icon: 'SetUp', order: 12 },
      },
      {
        path: 'settings/sla',
        name: 'PlatformSla',
        component: () => import('@/views/platform/settings/sla-config.vue'),
        meta: { title: 'SLA 时限配置', role: 'PLATFORM', icon: 'Timer', order: 13 },
      },
      {
        path: 'screen',
        name: 'PlatformScreen',
        component: () => import('@/views/platform/screen/index.vue'),
        meta: { title: '总览大屏', role: 'PLATFORM', icon: 'Monitor', order: 14 },
      },
    ],
  },
];