/**
 * 公共路由（5 条）—— 入口页 / 登录页 / 演示页 / 404
 * 均 meta.public = true，免登录
 */
import type { RouteRecordRaw } from 'vue-router';

export const commonRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Entry',
    component: () => import('@/views/common/entry/index.vue'),
    meta: { title: '入口选择', role: 'public', public: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/common/login/index.vue'),
    meta: { title: '登录', role: 'public', public: true },
  },
  {
    path: '/demo/guide',
    name: 'DemoGuide',
    component: () => import('@/views/common/demo-guide/index.vue'),
    meta: { title: '演示导览', role: 'public', public: true },
  },
  {
    path: '/demo/isolation',
    name: 'DemoIsolation',
    component: () => import('@/views/common/demo-isolation/index.vue'),
    meta: { title: '数据隔离演示', role: 'public', public: true },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/common/error/403.vue'),
    meta: { title: '无访问权限', role: 'public', public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/common/error/404.vue'),
    meta: { title: '页面不存在', role: 'public', public: true },
  },
];