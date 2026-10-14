/**
 * 定向探针：验证 verify-flows.cjs ③ 段 api 探针在「登出后」执行时的真实返回
 * 假设：auth store 纯内存态，logout+reload 后 role=null → resolveScope 落 VENDOR 兜底 → 可见集合空 → 三端全 0
 * 运行：node scripts/probe-loggedout-api.cjs（需 dev server 在 9900）
 */
const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:9900';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  // 复刻 verify-flows 的 logout()：回入口页 + reload（登录态不持久化 → 重置）
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 先看登录态
  const authState = await page.evaluate(async () => {
    try {
      const mod = await import('/src/store/auth.ts');
      const store = mod.useAuthStore();
      return { role: store.role, tenantId: store.tenantId, token: store.token };
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  });
  console.log('登出后 authStore 状态:', JSON.stringify(authState));

  // 完全复刻 verify-flows 的 isoProbe
  const isoProbe = await page.evaluate(async () => {
    const { platformApi } = await import('/src/api/index.ts');
    const { vendorApi } = await import('/src/api/index.ts');
    const { customerApi } = await import('/src/api/index.ts');
    const pick = async (fn) => {
      try {
        const r = await fn({ page: 1, pageSize: 1 });
        return typeof r?.total === 'number' ? r.total : -1;
      } catch (e) {
        return `ERR:${e && e.message ? e.message : e}`;
      }
    };
    return {
      platformDevices: await pick(platformApi.getDeviceList),
      platformOrders: await pick(platformApi.getWorkOrderList),
      vendorDevices: await pick(vendorApi.getDeviceList),
      vendorOrders: await pick(vendorApi.getWorkOrderList),
      customerDevices: await pick(customerApi.getDeviceList),
      customerOrders: await pick(customerApi.getWorkOrderList),
    };
  });
  console.log('登出态 api 探针返回:', JSON.stringify(isoProbe, null, 2));

  // 对照组：用 isolation api（scope 工厂实时计算，不依赖登录态）
  const matrix = await page.evaluate(async () => {
    const { getIsolationMatrix } = await import('/src/api/isolation.ts');
    return getIsolationMatrix().map((r) => ({ role: r.roleLabel, devices: r.devices, orders: r.orders }));
  });
  console.log('isolation api 矩阵（实时计算）:', JSON.stringify(matrix, null, 2));

  await browser.close();

  // 判定
  const n = (v) => (typeof v === 'number' ? v : -1);
  const ok1 = n(isoProbe.platformDevices) > n(isoProbe.vendorDevices) && n(isoProbe.vendorDevices) > n(isoProbe.customerDevices);
  console.log('\n── 判定 ──');
  console.log(`verify-flows 的设备递减断言（平台>厨具>客户）在登出态下: ${ok1 ? '通过' : '失败 ← 假设成立'}`);
})();
