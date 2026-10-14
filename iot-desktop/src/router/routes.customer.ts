/**
 * 客户端路由（13 条）—— 挂在 AppLayout 下，meta.role = 'CUSTOMER'
 */
import AppLayout from '@/components/layout/AppLayout.vue';

import type { RouteRecordRaw } from 'vue-router';

export const customerRoutes: RouteRecordRaw[] = [
  {
    path: '/customer',
    component: AppLayout,
    redirect: '/customer/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'CustomerDashboard',
        component: () => import('@/views/customer/dashboard/index.vue'),
        meta: { title: '工作台', role: 'CUSTOMER', icon: 'Odometer', order: 1, keepAlive: true },
      },
      {
        path: 'devices',
        name: 'CustomerDevices',
        component: () => import('@/views/customer/devices/device-list.vue'),
        meta: { title: '我的设备', role: 'CUSTOMER', icon: 'Cpu', order: 2, keepAlive: true },
      },
      {
        path: 'devices/:id',
        name: 'CustomerDeviceDetail',
        component: () => import('@/views/customer/devices/device-detail.vue'),
        meta: { title: '设备详情', role: 'CUSTOMER', parent: '/customer/devices' },
      },
      {
        path: 'alarms',
        name: 'CustomerAlarms',
        component: () => import('@/views/customer/alarms/alarm-center.vue'),
        meta: { title: '告警中心', role: 'CUSTOMER', icon: 'Bell', order: 3, keepAlive: true },
      },
      {
        path: 'alarms/:id',
        name: 'CustomerAlarmDetail',
        component: () => import('@/views/customer/alarms/alarm-detail.vue'),
        meta: { title: '告警详情', role: 'CUSTOMER', parent: '/customer/alarms' },
      },
      {
        path: 'work-orders',
        name: 'CustomerWorkOrders',
        component: () => import('@/views/customer/work-orders/order-list.vue'),
        meta: { title: '报修工单', role: 'CUSTOMER', icon: 'Tickets', order: 4, keepAlive: true },
      },
      {
        path: 'work-orders/create',
        name: 'CustomerWorkOrderCreate',
        component: () => import('@/views/customer/work-orders/order-create.vue'),
        meta: { title: '发起报修', role: 'CUSTOMER', parent: '/customer/work-orders' },
      },
      {
        path: 'work-orders/:id',
        name: 'CustomerWorkOrderDetail',
        component: () => import('@/views/customer/work-orders/order-detail.vue'),
        meta: { title: '工单详情', role: 'CUSTOMER', parent: '/customer/work-orders' },
      },
      {
        path: 'bindings',
        name: 'CustomerBindings',
        component: () => import('@/views/customer/bindings/binding-confirm.vue'),
        meta: { title: '绑定确认', role: 'CUSTOMER', icon: 'Connection', order: 5 },
      },
      {
        path: 'vendors',
        name: 'CustomerVendors',
        component: () => import('@/views/customer/vendors/vendor-list.vue'),
        meta: { title: '厂家服务评价', role: 'CUSTOMER', icon: 'Star', order: 6 },
      },
      {
        path: 'thresholds',
        name: 'CustomerThresholds',
        component: () => import('@/views/customer/thresholds/threshold-list.vue'),
        meta: { title: '阈值设置', role: 'CUSTOMER', icon: 'Odometer', order: 7 },
      },
      {
        path: 'accounts',
        name: 'CustomerAccounts',
        component: () => import('@/views/customer/accounts/account-list.vue'),
        meta: { title: '子账号管理', role: 'CUSTOMER', icon: 'User', order: 8 },
      },
      {
        path: 'notifications',
        name: 'CustomerNotifications',
        component: () => import('@/views/customer/notifications/index.vue'),
        meta: { title: '通知中心', role: 'CUSTOMER', icon: 'Message', order: 9 },
      },
    ],
  },
];