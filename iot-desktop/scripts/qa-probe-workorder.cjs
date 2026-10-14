/**
 * QA 定向探针：定位「平台方/厨具厂家 工单列表总数 = 0」的真实原因
 * 用法：node scripts/qa-probe-workorder.cjs
 */
const path = require('node:path');
const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:9900';
const OUT = path.resolve(__dirname, '../screenshots/qa');

async function login(page, role, displayName) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/#/login?role=${role}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.waitForFunction(() => {
    const el = document.querySelector('.login-card .el-select input');
    return el && el.value && el.value.length > 0;
  }, { timeout: 12000 }).catch(() => {});
  await page.locator('.login-card .el-select__wrapper').first().click();
  await page.waitForSelector('.el-select-dropdown__item', { timeout: 12000 });
  await page.locator('.el-select-dropdown__item').filter({ hasText: displayName }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e)));

  try {
    // ── A. 数据层直调：平台方工单列表 ──
    await login(page, 'platform', '平台超级管理员');
    const apiProbe = await page.evaluate(async () => {
      // @ts-ignore
      const { platformApi } = await import('/src/api/index.ts');
      const r = await platformApi.getWorkOrderList({ page: 1, pageSize: 20 });
      return { total: r.total, page: r.page, pageSize: r.pageSize, listLen: r.list.length, first3: r.list.slice(0, 3).map((o) => ({ code: o.code, status: o.status, vendorId: o.vendorId, customerId: o.customerId })) };
    });
    console.log('API 平台方工单:', JSON.stringify(apiProbe, null, 2));

    // ── B. UI 层：平台方工单页 ──
    await page.goto(`${BASE}/#/platform/work-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const uiProbe = await page.evaluate(() => {
      const rows = document.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row');
      const pag = document.querySelector('.hi-pagination');
      const empty = document.querySelector('.el-table__empty-text, .hi-empty');
      return {
        url: location.hash,
        rowCount: rows.length,
        paginationText: pag ? pag.innerText.replace(/\s+/g, ' ') : '(无 .hi-pagination)',
        paginationHTMLExists: !!pag,
        emptyText: empty ? empty.innerText.trim() : '(无空态元素)',
        firstRowText: rows[0] ? rows[0].innerText.replace(/\s+/g, ' ').slice(0, 160) : '(无行)',
        allPaginationEls: Array.from(document.querySelectorAll('[class*=pagination]')).map((e) => e.className),
      };
    });
    console.log('UI 平台方工单页:', JSON.stringify(uiProbe, null, 2));
    fs_write('probe-platform-workorder.png');

    // ── C. 平台方工单详情直达（上一轮报"含编号=false"）──
    await page.goto(`${BASE}/#/platform/work-orders/WO-2026-0031`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const detailProbe = await page.evaluate(() => ({
      url: location.hash,
      hasCode: document.body.innerText.includes('WO-2026-0031'),
      bodyHead: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300),
    }));
    console.log('UI 平台方工单详情:', JSON.stringify(detailProbe, null, 2));

    // ── D. 数据层：工单详情是否可取 ──
    const apiDetail = await page.evaluate(async () => {
      // @ts-ignore
      const { platformApi } = await import('/src/api/index.ts');
      try {
        const d = await platformApi.getWorkOrderDetail('WO-2026-0031');
        return { ok: true, code: d.order ? d.order.code : (d.code || '?'), status: d.order ? d.order.status : (d.status || '?') };
      } catch (e) { return { ok: false, err: String(e && e.message ? e.message : e) }; }
    });
    console.log('API 平台方工单详情:', JSON.stringify(apiDetail, null, 2));

    // ── E. 厨具厂家工单列表 ──
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await login(page, 'vendor', '厨具厂家·福州华厨设备（管理员）');
    const ckApi = await page.evaluate(async () => {
      // @ts-ignore
      const { vendorApi } = await import('/src/api/index.ts');
      const r = await vendorApi.getWorkOrderList({ page: 1, pageSize: 20 });
      return { total: r.total, listLen: r.list.length, sample: r.list.slice(0, 3).map((o) => ({ code: o.code, vendorId: o.vendorId, customerId: o.customerId, deviceSn: o.deviceSn })) };
    });
    console.log('API 厨具厂家工单:', JSON.stringify(ckApi, null, 2));

    await page.goto(`${BASE}/#/vendor/work-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const ckUi = await page.evaluate(() => {
      const rows = document.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row');
      const pag = document.querySelector('.hi-pagination');
      return {
        rowCount: rows.length,
        paginationText: pag ? pag.innerText.replace(/\s+/g, ' ') : '(无)',
        firstRow: rows[0] ? rows[0].innerText.replace(/\s+/g, ' ').slice(0, 140) : '(无行)',
      };
    });
    console.log('UI 厨具厂家工单页:', JSON.stringify(ckUi, null, 2));

    // ── F. 客户视图模型真实字段（修正我上一轮的错误断言）──
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    const custProbe = await page.evaluate(async () => {
      // @ts-ignore
      const { customerApi } = await import('/src/api/index.ts');
      const d = await customerApi.getDeviceList({ page: 1, pageSize: 200 });
      const w = await customerApi.getWorkOrderList({ page: 1, pageSize: 200 });
      const hist = await customerApi.getBindingHistory();
      return {
        devicesTotal: d.total,
        deviceKeys: d.list[0] ? Object.keys(d.list[0]) : [],
        deviceSns: d.list.map((x) => x.sn),
        ordersTotal: w.total,
        orderCodes: w.list.map((x) => x.code),
        orderKeys: w.list[0] ? Object.keys(w.list[0]) : [],
        bindingHistoryCount: Array.isArray(hist) ? hist.length : -1,
      };
    });
    console.log('API 客户视图:', JSON.stringify(custProbe, null, 2));

    // 客户在平台口径下到底有多少 OWNERSHIP 生效绑定
    const tenantProbe = await page.evaluate(async () => {
      // @ts-ignore
      const mod = await import('/src/mock/db.ts');
      const db = mod.getDb();
      const own = db.bindings.filter((b) => b.customerId === 'TEN-0005' && b.type === 'OWNERSHIP' && b.status === 'ACTIVE');
      const orders = db.workOrders.filter((o) => o.customerId === 'TEN-0005');
      return {
        ten0005ActiveOwnershipBindings: own.length,
        boundSns: Array.from(new Set(own.map((b) => b.deviceSn))),
        ten0005WorkOrders: orders.length,
        orderCodes: orders.map((o) => o.code),
        // 各租户 ACTIVE OWNERSHIP 绑定数分布
        perTenant: Array.from(db.bindings.filter((b) => b.type === 'OWNERSHIP' && b.status === 'ACTIVE')
          .reduce((m, b) => m.set(b.customerId, (m.get(b.customerId) || 0) + 1), new Map()).entries())
          .sort((a, b) => b[1] - a[1]).slice(0, 8),
      };
    });
    console.log('TEN-0005 绑定/工单事实:', JSON.stringify(tenantProbe, null, 2));

    // ── G. 平台方/厂家工单总数的事实核对（不看 UI，只看数据层 + mock）──
    const orderFacts = await page.evaluate(async () => {
      // @ts-ignore
      const db = (await import('/src/mock/db.ts')).getDb();
      const byVendor = {};
      db.workOrders.forEach((o) => { byVendor[o.vendorId] = (byVendor[o.vendorId] || 0) + 1; });
      return { totalWorkOrders: db.workOrders.length, byVendor };
    });
    console.log('工单按厂家分布:', JSON.stringify(orderFacts, null, 2));
  } catch (e) {
    console.log('PROBE ERROR:', String(e && e.stack ? e.stack.split('\n').slice(0, 5).join('\n') : e));
  } finally {
    console.log('\nCONSOLE ERRORS:', errs.length, JSON.stringify(errs.slice(0, 8), null, 2));
    await browser.close();
  }

  function fs_write(name) {
    const fs = require('node:fs');
    fs.mkdirSync(OUT, { recursive: true });
    page.screenshot({ path: path.join(OUT, name) }).catch(() => {});
  }
})();
