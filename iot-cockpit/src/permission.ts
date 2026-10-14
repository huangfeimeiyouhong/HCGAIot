/**
 * 路由守卫:登录态校验
 * 模板默认 mock 放行(见 store/auth.ts 注释);
 * 接入真实 SSO 只需改 store/auth.ts 与 .env,此处无需改动。
 *
 * 注意: useAuthStore() 在守卫回调内调用,首次导航时 pinia 已挂载,安全。
 */
import router from '@/router';
import { useAuthStore } from '@/store/auth';

router.beforeEach(async () => {
  const authStore = useAuthStore();
  await authStore.ensureLoggedIn();
  return true;
});
