/**
 * 应用入口
 * createApp + Pinia + Router + ElementPlus(zhCn) + 全局 SCSS + 全局图标 + 权限守卫
 */
import { createApp } from 'vue';

import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { createPinia } from 'pinia';

import App from './App.vue';
import { thousand } from './directives/thousand';
import router from './router';

import 'element-plus/dist/index.css';
import './styles/index.scss';

// Element Plus 图标全局注册（菜单与按钮用组件名动态渲染）
import * as ElIcons from '@element-plus/icons-vue';

// 登录态路由守卫（guard 已在 router/index.ts 内装配，此处 import 保留显式依赖）
import './permission';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: zhCn });

// 图标全局注册：<component :is="'Odometer'" /> 直接可用
Object.entries(ElIcons).forEach(([name, component]) => {
  app.component(name, component);
});

// 千分位指令：v-thousand="12345" → 12,345
app.directive('thousand', thousand);

app.mount('#app');