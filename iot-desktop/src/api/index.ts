/**
 * API 层统一出口 —— 页面只 import from '@/api'
 *
 * ⚠️ 约定 2 硬性规则 4：api/* 不 import store 的具体 store 文件，
 *    只在函数体内调用 useAuthStore()（函数内调用不产生模块级循环）
 */
export { authApi } from './auth';
export { commonApi } from './common';
export { platformApi } from './platform';
export { vendorApi } from './vendor';
export { customerApi } from './customer';

export type * from './types';