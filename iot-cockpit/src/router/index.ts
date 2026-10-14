import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

import Layout from '@/layouts/index.vue';

/**
 * 路由表
 * - IotCockpit:全景监控首页(中国地图 + 五大面板)
 * - IotProvince:省份下钻页(中国地图点击福建省进入)
 * meta.keepAlive: true 时组件被布局层 keep-alive 缓存(组件 name 须与路由 name 一致)
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'IotCockpit',
        component: () => import('@/views/iot-cockpit/index.vue'),
        meta: { title: '后厨管家 · IoT 设备全景监控中心', keepAlive: true },
      },
      {
        path: 'dashboard/province/:code',
        name: 'IotProvince',
        component: () => import('@/views/iot-cockpit/province.vue'),
        meta: { title: '省份设备分布', header: 'detail', keepAlive: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// keep-alive 注册:路由 meta.keepAlive 驱动,组件 name 须与路由 name 一致
router.afterEach((to) => {
  if (to.meta.keepAlive && to.name) {
    // 动态 import 避免循环依赖
    import('@/store/app').then(({ useAppStore }) => {
      useAppStore().addKeepAlive(to.name as string);
    });
  }
});

export default router;
