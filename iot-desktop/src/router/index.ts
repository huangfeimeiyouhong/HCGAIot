/**
 * 路由实例 —— 单 router + 4 个模块文件 + 集中守卫
 *
 * ⚠️ hash 模式（createWebHashHistory）：交付形态是纯静态包，
 *    hash 路由无需服务端 rewrite 配置，双击 dist/index.html 也能打开
 */
import { createRouter, createWebHashHistory } from 'vue-router';

import { setupGuard } from './guard';
import { commonRoutes } from './routes.common';
import { customerRoutes } from './routes.customer';
import { platformRoutes } from './routes.platform';
import { vendorRoutes } from './routes.vendor';

import type { RouteRecordRaw } from 'vue-router';

/** 全部路由（5 公共 + 3 布局父级 + 46 页面） */
export const routes: RouteRecordRaw[] = [
  ...commonRoutes,
  ...platformRoutes,
  ...vendorRoutes,
  ...customerRoutes,
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

setupGuard(router);

export default router;