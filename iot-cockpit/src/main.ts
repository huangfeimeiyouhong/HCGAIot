import { createApp } from 'vue';

import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { createPinia } from 'pinia';

import App from './App.vue';
import { thousand } from './directives/thousand';
import router from './router';

import 'element-plus/dist/index.css';
import './styles/index.scss';

// 登录态路由守卫(mock 放行,见 src/permission.ts)
import './permission';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: zhCn });

// 千分位指令:v-thousand="12345" → 12,345
app.directive('thousand', thousand);

app.mount('#app');
