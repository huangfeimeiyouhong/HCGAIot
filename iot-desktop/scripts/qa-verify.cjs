/**
 * QA 独立验收脚本（严过关 / software-qa-engineer）
 *
 * ⚠️ 本脚本刻意不复用 scripts/verify-flows.cjs 的断言，全部重写，断言更严：
 *   - 计数类断言用「精确值 + 集合包含关系」，不用 `> 0` / `< 86` 这类永真式
 *   - 状态流转断言先记基线再比对增量，不只判「节点数 > 0」
 *   - 越权用例区分「路由拦截」与「数据层过滤」两种结果并分别记录
 *   - 控制台错误按类型分桶，不做正则静默过滤（只忽略 favicon）
 *
 * 运行：node scripts/qa-verify.cjs
 * 环境：BASE_URL（默认 http://localhost:9900）
 */
const path = require('node:path');
const fs = require('node:fs');

const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:9900';
const OUT = path.resolve(__dirname, '../screenshots/qa/round2');

const results = [];
const facts = {};

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
}

/** 记录实测事实（不算断言，只留证据） */
function fact(key, value) {
  facts[key] = value;
  console.log(`  FACT | ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
}

/**
 * 页面级占位标记（既收窄、又不漏）：
 * - 不能只用宽泛的 /占位|第二批/ —— 已实现页面里的合规提示
 *   （如「仅演示占位，不会上传真实文件」）会被误判成占位页；
 * - 但也不能丢掉本工程第一版占位页的原生措辞
 *   「第二批交付（P1 页面），当前为占位实现」/「第二批交付完整实现」——
 *   这两个词组里既没有「占位页」也没有「第二批实现」，
 *   只按前者收窄会把旧占位文案漏掉，导致占位页被误报为「已实现」。
 * 因此同时收录两套措辞，并显式排除上传类合规提示。
 */
const PAGE_PLACEHOLDER_RE =
  /占位实现|占位页|页面占位|第二批交付|第二批实现|第二批开发|待开发|敬请期待|功能建设中|页面建设中/;
/** 已实现页面里合法出现的「占位」字样（不视为页面未实现），命中则不判占位 */
const NOT_PLACEHOLDER_HINTS =
  /仅演示占位|演示占位|占位符|上传占位|占位文本|placeholder/i;
/** 最终判定：命中占位标记、且不含合规提示，才算占位页 */
function isPlaceholderPage(text) {
  const t = String(text || '');
  return PAGE_PLACEHOLDER_RE.test(t) && !NOT_PLACEHOLDER_HINTS.test(t);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
}

/* ============ 页面读取工具（独立实现） ============ */

/** 读分页组件上的总条数；读不到返回 -1 而不是 0，避免把「读失败」误判成「0 条」 */
async function readTotal(page) {
  const txt = await page.locator('.hi-pagination').first().innerText().catch(() => '');
  const m = String(txt).match(/共\s*([\d,]+)\s*条/);
  if (m) return Number(m[1].replace(/,/g, ''));
  // 兜底：数表格行（有分页时为当前页行数，单独标注）
  return -1;
}

/** 直接从表格行里抽出 SN/编号列，构造「实际可见集合」 */
async function readTableCol(page, colIdx = 0) {
  return page.evaluate((idx) => {
    const rows = Array.from(document.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row'));
    return rows
      .map((tr) => {
        const tds = tr.querySelectorAll('td');
        return (tds[idx]?.innerText || '').trim();
      })
      .filter(Boolean);
  }, colIdx);
}

/** 读表格总行数（含翻页，仅作辅助证据） */
const readRows = (page) =>
  page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();

/** 读页面顶栏的「数据范围」徽标全文 */
const readScopeBadge = (page) =>
  page.locator('.hi-scope-badge__text').first().innerText().catch(() => '(未找到)');

/** 读侧栏菜单项文本清单（用于三入口结构比对） */
const readMenuTexts = (page) =>
  page.locator('.hi-sidenav .el-menu-item').allInnerTexts().then((a) => a.map((s) => s.replace(/\s+/g, ' ').trim()));

/** 等表格与 loading 结束 */
async function waitTable(page, timeout = 15000) {
  await page.waitForSelector('.el-table__body-wrapper tbody tr.el-table__row', { timeout }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.el-loading-mask'), { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * 等分页总数稳定为一个正数。
 * ⚠️ 第一轮实测教训：mock 有 200ms 延迟，仅靠 waitTable 会读到 total 初始值 0，
 *    必须轮询到「连续两次读数相同且 > 0」才算加载完成，否则会误报 0 条。
 */
async function waitTotalStable(page, timeout = 12000) {
  const end = Date.now() + timeout;
  let last = -2;
  let stableHits = 0;
  while (Date.now() < end) {
    const t = await readTotal(page);
    if (t === last && t > 0) {
      stableHits += 1;
      if (stableHits >= 2) return t;
    } else {
      stableHits = 0;
    }
    last = t;
    await page.waitForTimeout(400);
  }
  return last;
}

/** 轮询等待页面包含某文本 */
async function waitText(page, text, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const t = await page.locator('.hi-page, .hi-layout, body').first().innerText().catch(() => '');
    if (t.includes(text)) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

/** 按钮精确文本匹配（避免「待接单」被「接单」误命中） */
async function buttonTexts(page, scope = '') {
  const sel = scope ? `${scope} button, ${scope} .el-button` : 'button, .el-button';
  return (await page.locator(sel).allInnerTexts()).map((s) => s.replace(/\s+/g, ''));
}

async function hasBtn(page, text, scope = '') {
  const list = await buttonTexts(page, scope);
  const t = text.replace(/\s+/g, '');
  return list.some((x) => x === t || x.endsWith(t));
}

/* ============ 登录 / 登出 ============ */

async function login(page, role, displayName) {
  // 先回入口页，强制 router 重建登录组件（否则仅 hash 变化会复用实例）
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/#/login?role=${role}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.login-card .el-select input');
      return el && el.value && el.value.length > 0;
    },
    { timeout: 12000 },
  ).catch(() => {});
  await page.locator('.login-card .el-select__wrapper').first().click();
  await page.waitForSelector('.el-select-dropdown__item', { timeout: 12000 });
  await page.locator('.el-select-dropdown__item').filter({ hasText: displayName }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // 记录登录后真实落点，供证据使用
  fact(`landing:${displayName}`, page.url().replace(BASE, ''));
}

async function logout(page) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

/**
 * 同 SPA 会话内切换账号（不刷新页面）
 *
 * ⚠️ 关键：mock 库是模块级内存态，page.reload() 会把它重置回初始数据。
 *    因此「跨入口状态延续」类用例（例：厂家把工单推到待验收 → 客户看到待验收）
 *    绝不能用 logout()（它内部 reload），必须走 UI 的「返回入口切换」——
 *    它只调 auth.logout() + router.push('/')，不刷新页面，mock 状态得以保留。
 */
async function switchAccount(page, role, displayName) {
  const backBtn = page.locator('.hi-sidenav__back').first();
  if ((await backBtn.count()) > 0) {
    await backBtn.click();
    await page.waitForTimeout(700);
  } else {
    // 当前不在带侧栏的页面（如在入口页），直接 hash 跳登录
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => { window.location.hash = '#/'; });
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/#/login?role=${role}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.login-card .el-select input');
      return el && el.value && el.value.length > 0;
    },
    { timeout: 12000 },
  ).catch(() => {});
  await page.locator('.login-card .el-select__wrapper').first().click();
  await page.waitForSelector('.el-select-dropdown__item', { timeout: 12000 });
  await page.locator('.el-select-dropdown__item').filter({ hasText: displayName }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  fact(`switch:${displayName}`, page.url().replace(BASE, ''));
}

/* ============ 主流程 ============ */

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  /* ---- 错误分桶收集，全程不静默 ---- */
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    failedRequests.push(`${r.url()} :: ${f ? f.errorText : 'unknown'}`);
  });

  try {
    /* ============================================================
     * 用例组 1 — 数据隔离（四端对照，这是技术底线）
     * ============================================================ */
    console.log('\n========== 组 1：数据隔离四端对照 ==========');

    // —— 1.1 平台方
    await login(page, 'platform', '平台超级管理员');
    check('平台方登录后落在 /platform/dashboard', page.url().includes('/platform/dashboard'), page.url().replace(BASE, ''));
    fact('platform.scopeBadge', await readScopeBadge(page));
    fact('platform.menuTexts', await readMenuTexts(page));

    await page.goto(`${BASE}/#/platform/devices`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const pDevTotal = await readTotal(page);
    fact('platform.devices.total', pDevTotal);
    check('平台方设备列表总数 = 86（全量）', pDevTotal === 86, `实测 ${pDevTotal}`);

    await page.goto(`${BASE}/#/platform/work-orders`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const pWoTotal = await waitTotalStable(page);
    fact('platform.workOrders.total', pWoTotal);
    check('平台方工单列表总数 = 67（全量，F3 后 +3）', pWoTotal === 67, `实测 ${pWoTotal}`);
    await shot(page, '01-platform-devices');

    // 原「一般-3」：平台方没有工单详情路由，手输详情 URL 落 404（兜底正常但体验欠佳）。
    // 第三轮已补 /platform/work-orders/:id 只读详情页，这里改为断言「真实渲染只读详情」：
    //   ① 不再落 404；② 渲染出只读信息区；③ 只暴露「标记争议」这一个平台方动作。
    await page.goto(`${BASE}/#/platform/work-orders/WO-2026-0031`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const pOrderBody = await page.locator('body').innerText().catch(() => '');
    const pOrderDetailOk = !/404|页面不存在/.test(pOrderBody);
    fact('platform.workOrderDetailRouteExists', pOrderDetailOk);
    fact('platform.workOrderDetail.bodyHead', pOrderBody.replace(/\s+/g, ' ').slice(0, 120));
    check('【已修复】平台方工单详情已有路由 → 渲染只读详情页而非 404',
      pOrderDetailOk, `实际渲染：${pOrderBody.replace(/\s+/g, ' ').slice(0, 60)}`);
    check('【已修复】平台方工单详情含只读信息区（工单信息 / 处理进展 / 流转留痕）',
      pOrderBody.includes('工单信息') && pOrderBody.includes('处理进展') && pOrderBody.includes('流转留痕'),
      `工单信息=${pOrderBody.includes('工单信息')} 处理进展=${pOrderBody.includes('处理进展')} 流转留痕=${pOrderBody.includes('流转留痕')}`);
    // ⚠️ 不能按「正文里有没有这几个字」判断动作入口：
    //    SLA 时限文案会写「接单 2h / 处理 12h / 验收 24h」，时间轴记录里也有「接单」动作名，
    //    按正文匹配必然误报。必须只看页面上真实存在的按钮。
    const pOrderBtns = (await page.locator('button, .el-button').allInnerTexts())
      .map((t) => t.replace(/\s+/g, ''))
      .filter(Boolean);
    fact('platform.workOrderDetail.buttons', pOrderBtns);
    // ⚠️ 不能命名为 hasBtn —— 会遮蔽脚本顶层的 hasBtn(page, text, scope) helper，
    //    导致后续工单闭环组的所有按钮断言静默失效（变量遮蔽，极难排查）。
    const pOrderHasBtn = (kw) => pOrderBtns.some((t) => t === kw || t.includes(kw));
    check('【已修复】平台方工单详情有「标记争议」按钮',
      pOrderHasBtn('标记争议'), `buttons=${pOrderBtns.join('/')}`);
    check('【已修复】平台方工单详情无「接单」按钮（平台不参与处理）',
      !pOrderHasBtn('接单'), `buttons=${pOrderBtns.join('/')}`);
    check('【已修复】平台方工单详情无「验收通过」按钮（只读视角）',
      !pOrderHasBtn('验收通过'), `buttons=${pOrderBtns.join('/')}`);
    // 平台方仍应能在列表里看到故事线工单（数据层全量可见）
    const pSeesStory = await page.evaluate(async () => {
      // @ts-ignore
      const { platformApi } = await import('/src/api/index.ts');
      const r = await platformApi.getWorkOrderList({ page: 1, pageSize: 100 });
      return r.list.some((o) => o.code === 'WO-2026-0031');
    });
    check('平台方数据层可见故事线工单 WO-2026-0031', pSeesStory === true, `visible=${pSeesStory}`);

    await logout(page);

    // —— 1.2 厨具厂家
    await login(page, 'vendor', '厨具厂家·福州华厨设备（管理员）');
    check('厨具厂家落在 /vendor/dashboard', page.url().includes('/vendor/dashboard'), page.url().replace(BASE, ''));
    fact('cookware.scopeBadge', await readScopeBadge(page));
    fact('cookware.menuTexts', await readMenuTexts(page));
    await shot(page, '03-cookware-dashboard');

    await page.goto(`${BASE}/#/vendor/devices`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const ckDevTotal = await readTotal(page);
    fact('cookware.devices.total', ckDevTotal);
    check('厨具厂家设备总数 < 平台 86', ckDevTotal > 0 && ckDevTotal < 86, `实测 ${ckDevTotal}`);
    check('厨具厂家设备总数 = 53（工程师自报值，需精确对上）', ckDevTotal === 53, `实测 ${ckDevTotal}，自报 53`);

    await page.goto(`${BASE}/#/vendor/work-orders`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const ckWoTotal = await waitTotalStable(page);
    fact('cookware.workOrders.total', ckWoTotal);
    check(`厨具厂家工单总数 < 平台方（实测 ${pWoTotal}）`, ckWoTotal > 0 && ckWoTotal < pWoTotal, `实测 ${ckWoTotal}`);
    // 自报值随 F3「TEN-0005 扩样本」+ 工单归属对齐（reconcileOrderOwnership）更新为 35
    check(`厨具厂家工单总数 = 35（工程师自报值，需精确对上）`, ckWoTotal === 35, `实测 ${ckWoTotal}，自报 35`);
    await shot(page, '04-cookware-workorders');

    await logout(page);

    // —— 1.3 物联网厂家
    await login(page, 'vendor', '物联网厂家·厦门智联感知（管理员）');
    check('物联网厂家落在 /vendor/dashboard', page.url().includes('/vendor/dashboard'), page.url().replace(BASE, ''));
    fact('iot.scopeBadge', await readScopeBadge(page));
    fact('iot.menuTexts', await readMenuTexts(page));

    await page.goto(`${BASE}/#/vendor/devices`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const iotDevTotal = await readTotal(page);
    fact('iot.devices.total', iotDevTotal);
    check('物联网厂家设备总数 < 平台 86 且 ≠ 厨具厂家', iotDevTotal > 0 && iotDevTotal < 86 && iotDevTotal !== ckDevTotal,
      `实测 ${iotDevTotal}（厨具 ${ckDevTotal}）`);
    await shot(page, '05-iot-devices');

    await page.goto(`${BASE}/#/vendor/work-orders`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const iotWoTotal = await waitTotalStable(page);
    fact('iot.workOrders.total', iotWoTotal);
    check('物联网厂家工单总数 ≠ 厨具厂家工单数', iotWoTotal !== ckWoTotal, `物联网 ${iotWoTotal} vs 厨具 ${ckWoTotal}`);

    await logout(page);

    // —— 1.4 客户（关键：客户设备/工单详情此前是占位页，现已实现，UI 上可直接验证隔离）
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    check('客户落在 /customer/dashboard', page.url().includes('/customer/dashboard'), page.url().replace(BASE, ''));
    fact('customer.scopeBadge', await readScopeBadge(page));
    fact('customer.menuTexts', await readMenuTexts(page));
    await shot(page, '06-customer-dashboard');

    await page.goto(`${BASE}/#/customer/devices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const custDevBody = await page.locator('.hi-page, body').first().innerText().catch(() => '');
    const custDevIsPlaceholder = isPlaceholderPage(custDevBody);
    fact('customer.devices.isPlaceholder', custDevIsPlaceholder);
    check('【已修复】客户端「我的设备」非占位（可在 UI 上验证客户设备隔离）',
      !custDevIsPlaceholder, `占位=${custDevIsPlaceholder}`);

    await page.goto(`${BASE}/#/customer/work-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const custWoBody = await page.locator('.hi-page, body').first().innerText().catch(() => '');
    const custWoIsPlaceholder = isPlaceholderPage(custWoBody);
    fact('customer.workOrders.isPlaceholder', custWoIsPlaceholder);
    check('【已修复】客户端「报修工单」列表非占位（可在 UI 上验证客户工单隔离）',
      !custWoIsPlaceholder, `占位=${custWoIsPlaceholder}`);
    await shot(page, '07-customer-orders-implemented');

    // —— 1.5 客户越权：手输 URL 访问不属于自己的设备详情
    // 先找一个「确定不属于 TEN-0005」的 SN（从平台方视角拿一台设备的归属）
    await logout(page);
    await login(page, 'platform', '平台超级管理员');
    const probe = await page.evaluate(async () => {
      // @ts-ignore
      const { platformApi } = await import('/src/api/index.ts');
      const r = await platformApi.getDeviceList({ page: 1, pageSize: 200 });
      const list = r.list || [];
      return {
        total: r.total,
        sample: list.slice(0, 3).map((d) => ({ sn: d.sn, owner: d.ownerCustomerId, name: d.deviceName || d.name })),
        foreign: list.filter((d) => d.ownerCustomerId && d.ownerCustomerId !== 'TEN-0005').slice(0, 3)
          .map((d) => ({ sn: d.sn, owner: d.ownerCustomerId })),
      };
    });
    fact('platform.deviceProbe', probe);

    await logout(page);
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    const foreignSn = (probe.foreign && probe.foreign[0] && probe.foreign[0].sn) || null;
    fact('customer.foreignSnProbe', foreignSn);

    if (foreignSn) {
      // 用客户身份调 customerApi.getDeviceDetail 访问他人设备 —— 纯数据层，不经路由
      const detailProbe = await page.evaluate(async (sn) => {
        // @ts-ignore
        const { customerApi } = await import('/src/api/index.ts');
        try {
          const d = await customerApi.getDeviceDetail(sn);
          return { ok: true, data: d };
        } catch (e) {
          return { ok: false, err: String(e && e.message ? e.message : e) };
        }
      }, foreignSn);
      fact('customer.crossTenantDeviceDetail', detailProbe.ok ? 'RETURNED_DATA' : `THREW:${detailProbe.err}`);
      check('【核心】客户账号在数据层取他人设备详情被拒（不是靠路由拦截）',
        detailProbe.ok === false, detailProbe.ok ? `竟返回了数据：${JSON.stringify(detailProbe.data).slice(0, 200)}` : `抛错 ${detailProbe.err}`);

      // 顺便看 UI 侧表现
      await page.goto(`${BASE}/#/customer/devices/${foreignSn}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const body = await page.locator('body').innerText().catch(() => '');
      const leaked = body.includes(foreignSn);
      fact('customer.crossTenantDeviceUrlPageShowsSn', leaked);
      check('客户手输他人设备详情 URL 时页面不泄露该 SN', leaked === false, `页面含该 SN=${leaked}`);
      await shot(page, '08-customer-cross-tenant-url');
    } else {
      check('客户越权用例未能执行（未找到外租户 SN）', false, 'probe.foreign 为空');
    }

    // 客户可见设备集合（走数据层，绕过占位页）
    // ⚠️ CustomerDeviceView / CustomerOrderView 是裁剪后的视图对象，
    //    本就不含 ownerCustomerId / customerId（字段裁剪是设计要求），
    //    因此不能断言 VO 上的租户字段，必须与 mock 层的生效绑定事实对账。
    const custScopeProbe = await page.evaluate(async () => {
      // @ts-ignore
      const { customerApi } = await import('/src/api/index.ts');
      // @ts-ignore
      const { getDb } = await import('/src/mock/db.ts');
      const db = getDb();
      const dev = await customerApi.getDeviceList({ page: 1, pageSize: 200 });
      const wo = await customerApi.getWorkOrderList({ page: 1, pageSize: 200 });
      const expectedSns = Array.from(new Set(
        db.bindings
          .filter((b) => b.customerId === 'TEN-0005' && b.type === 'OWNERSHIP' && b.status === 'ACTIVE')
          .map((b) => b.deviceSn),
      ));
      const expectedOrders = db.workOrders.filter((o) => o.customerId === 'TEN-0005').map((o) => o.code);
      return {
        devicesTotal: dev.total,
        deviceSns: dev.list.map((d) => d.sn),
        expectedSns,
        ordersTotal: wo.total,
        orderCodes: wo.list.map((o) => o.code),
        expectedOrders,
        voKeys: dev.list[0] ? Object.keys(dev.list[0]) : [],
      };
    });
    fact('customer.api.devicesTotal', custScopeProbe.devicesTotal);
    fact('customer.api.deviceSns', custScopeProbe.deviceSns);
    fact('customer.api.expectedSns(生效产权绑定)', custScopeProbe.expectedSns);
    fact('customer.api.ordersTotal', custScopeProbe.ordersTotal);
    fact('customer.api.orderCodes', custScopeProbe.orderCodes);
    fact('customer.api.expectedOrders', custScopeProbe.expectedOrders);
    fact('customer.api.voKeys(已裁剪)', custScopeProbe.voKeys);
    fact('customer.api.voHasFirmwareOrCost',
      custScopeProbe.voKeys.includes('firmwareVersion') || custScopeProbe.voKeys.includes('cost'));

    check('客户可见设备集合 == 其 ACTIVE 产权绑定集合（不多不少）',
      JSON.stringify([...custScopeProbe.deviceSns].sort()) === JSON.stringify([...custScopeProbe.expectedSns].sort()),
      `可见=${JSON.stringify(custScopeProbe.deviceSns)} 期望=${JSON.stringify(custScopeProbe.expectedSns)}`);
    check('客户可见设备数 < 平台 86', custScopeProbe.devicesTotal < 86, `实测 ${custScopeProbe.devicesTotal}`);
    check('客户可见工单集合 == 其 customerId 下的工单集合',
      JSON.stringify([...custScopeProbe.orderCodes].sort()) === JSON.stringify([...custScopeProbe.expectedOrders].sort()),
      `可见=${JSON.stringify(custScopeProbe.orderCodes)} 期望=${JSON.stringify(custScopeProbe.expectedOrders)}`);
    const hasFirmwareCost = custScopeProbe.voKeys.includes('firmwareVersion') || custScopeProbe.voKeys.includes('cost');
    check('客户视角 VO 已裁剪掉 firmwareVersion / cost',
      hasFirmwareCost === false, `keys=${JSON.stringify(custScopeProbe.voKeys)}`);

    /* ============================================================
     * 用例组 2 — 工单闭环五态（严格增量断言）
     * ============================================================ */
    console.log('\n========== 组 2：工单闭环五态 ==========');
    await logout(page);
    await login(page, 'vendor', '厨具厂家·福州华厨设备（管理员）');

    await page.goto(`${BASE}/#/vendor/work-orders/WO-2026-0031`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.order-actions button, .sla-countdown, .hi-page', { timeout: 18000 }).catch(() => {});
    await page.waitForTimeout(900);

    const badge0 = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    fact('order.badge.initial', badge0);
    check('① 工单初始态 = 待接单', badge0.includes('待接单'), badge0);

    const btns0 = await buttonTexts(page, '.order-actions');
    fact('order.buttons.initial', btns0);
    check('待接单态有「接单」入口', await hasBtn(page, '接单', '.order-actions'), btns0.join('/'));
    check('待接单态无「更新进展」入口（状态机按钮收敛）', !(await hasBtn(page, '更新进展', '.order-actions')), btns0.join('/'));

    // 基线时间轴节点数
    const tl0 = await page.locator('.el-timeline-item').count();
    fact('order.timeline.baseline', tl0);

    // ② 空说明点「确认接单」应被拦
    await page.getByRole('button', { name: '接单', exact: true }).first().click();
    await page.waitForTimeout(800);
    const dlgOpen1 = await page.locator('.el-dialog').first().isVisible().catch(() => false);
    check('② 点「接单」弹出说明对话框', dlgOpen1, `dialogVisible=${dlgOpen1}`);

    await page.getByRole('button', { name: '确认接单' }).click();
    await page.waitForTimeout(1000);
    const dlgStillOpen = await page.locator('.el-dialog').first().isVisible().catch(() => false);
    const badgeAfterEmpty = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    check('② 空说明点确认：弹窗未关闭（前端拦住）', dlgStillOpen, `stillOpen=${dlgStillOpen}`);
    check('② 空说明点确认：状态未被篡改（仍待接单）', badgeAfterEmpty.includes('待接单'), badgeAfterEmpty);
    await shot(page, '09-order-accept-validate');

    // 校验提示是否可见（不只是弹窗没关）
    const warnText = await page.locator('.el-form-item__error, .el-message').allInnerTexts().catch(() => []);
    fact('order.acceptEmpty.validationHints', warnText);
    check('② 空说明有可见的校验提示文案', warnText.length > 0, JSON.stringify(warnText).slice(0, 160));

    // ③ 填说明接单 → 处理中
    await page.locator('.el-dialog textarea').first().fill('QA 复测：已电话联系客户，约定今日 14:00 上门处理');
    await page.locator('.el-dialog__footer button').last().click();
    await page.waitForTimeout(2000);
    const badge1 = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    fact('order.badge.afterAccept', badge1);
    check('③ 接单后状态 = 处理中', badge1.includes('处理中'), badge1);

    const btns1 = await buttonTexts(page, '.order-actions');
    fact('order.buttons.afterAccept', btns1);
    check('③ 处理中出现「更新进展」与「反馈处理结果」',
      (await hasBtn(page, '更新进展', '.order-actions')) && (await hasBtn(page, '反馈处理结果', '.order-actions')),
      btns1.join('/'));

    // ④ 连续 3 次更新进展，验证时间轴严格累积 +3
    const tlBefore = await page.locator('.el-timeline-item').count();
    for (let i = 1; i <= 3; i += 1) {
      await page.getByRole('button', { name: '更新进展' }).first().click();
      await page.waitForTimeout(700);
      await page.locator('.el-dialog textarea').first().fill(`QA 进展 ${i}：工程师已到场，正在处理`);
      await page.locator('.el-dialog__footer button').last().click();
      await page.waitForTimeout(1200);
    }
    const tlAfter = await page.locator('.el-timeline-item').count();
    fact('order.timeline.beforeProgress', tlBefore);
    fact('order.timeline.afterProgress3', tlAfter);
    check('④ 3 次更新进展后时间轴节点严格 +3（累积而非覆盖）',
      tlAfter === tlBefore + 3, `before=${tlBefore} after=${tlAfter} delta=${tlAfter - tlBefore}`);
    await shot(page, '10-order-progress-accumulated');

    // 进度记录表也应累积
    const progressRows = await page.locator('.progress-list .el-table__row, .progress-table .el-table__row').count();
    fact('order.progressRows', progressRows);

    // ⑤ 反馈处理结果：空说明应被拦
    await page.getByRole('button', { name: '反馈处理结果' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /提交并转待验收/ }).click();
    await page.waitForTimeout(1000);
    const dlgStillOpen2 = await page.locator('.el-dialog').first().isVisible().catch(() => false);
    const badge2 = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    check('⑤ 反馈空说明：弹窗未关闭（被拦）', dlgStillOpen2, `stillOpen=${dlgStillOpen2}`);
    check('⑤ 反馈空说明：状态仍为处理中（未被篡改）', badge2.includes('处理中'), badge2);
    const warn2 = await page.locator('.el-form-item__error, .el-message').allInnerTexts().catch(() => []);
    fact('order.feedbackEmpty.validationHints', warn2);
    check('⑤ 反馈空说明有可见校验提示', warn2.length > 0, JSON.stringify(warn2).slice(0, 160));
    await shot(page, '11-order-feedback-validate');

    // 填写 + 提交 → 待验收
    await page.locator('.el-dialog textarea').first().fill('QA 复测：已更换压缩机与温控器，设备恢复正常，现场观察 30 分钟无异常');
    await page.locator('.el-dialog__footer button').last().click();
    await page.waitForTimeout(2200);
    const badge3 = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    fact('order.badge.afterFeedback', badge3);
    check('⑥ 反馈后状态 = 待验收', badge3.includes('待验收'), badge3);
    await shot(page, '12-order-pending-confirm');

    /* ============================================================
     * 用例组 3 — 客户验收环节（断点一：客户验收工单）+ 绑定确认（断点二）
     *   本组确认 P0 客户端页面已脱占位、两条主链路在 UI 上点得通
     * ============================================================ */
    console.log('\n========== 组 3：客户验收 + 绑定确认（断点一/二，已修复） ==========');
    await logout(page);
    await login(page, 'customer', '福州第一中学食堂（管理员）');

    // 3.1 客户工单列表页已实现且含「待验收」状态（闭环第 5 态在 UI 可达）
    await page.goto(`${BASE}/#/customer/work-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await waitTable(page);
    const custWoBody2 = await page.locator('body').innerText().catch(() => '');
    fact('customer.workOrdersPageBody.head', custWoBody2.replace(/\s+/g, ' ').slice(0, 220));
    const custWoImplemented = !/占位|第二批/.test(custWoBody2);
    const custWoHasPendingConfirm = custWoBody2.includes('待验收');
    check('【已修复】客户工单列表页已实现（非占位）', custWoImplemented, `占位=${!custWoImplemented}`);
    check('【已修复】客户工单列表含「待验收」状态（闭环第 5 态可达）',
      custWoHasPendingConfirm, `含待验收=${custWoHasPendingConfirm}`);

    // 3.2 PRD P0-12/13/14/15/16 要求的 13 个客户端页面逐个点名，确认全部脱占位
    const p0CustomerPages = [
      { p: '/customer/dashboard', id: 'C-01', p0: 'P0-12' },
      { p: '/customer/devices', id: 'C-02', p0: 'P0-12' },
      { p: '/customer/devices/CK-RF-2026-0005', id: 'C-03', p0: 'P0-12' },
      { p: '/customer/alarms', id: 'C-04', p0: 'P0-13' },
      { p: '/customer/alarms/ALM-2026-0088', id: 'C-05', p0: 'P0-13' },
      { p: '/customer/work-orders', id: 'C-06', p0: 'P0-14' },
      { p: '/customer/work-orders/create', id: 'C-07', p0: 'P0-14' },
      { p: '/customer/work-orders/WO-2026-0031', id: 'C-08', p0: 'P0-14/P0-15' },
      { p: '/customer/bindings', id: 'C-09', p0: 'P0-15' },
      { p: '/customer/vendors', id: 'C-10', p0: 'P0-16' },
      { p: '/customer/thresholds', id: 'C-11', p0: 'P0-16' },
      { p: '/customer/accounts', id: 'C-12', p0: 'P0-16' },
      { p: '/customer/notifications', id: 'C-13', p0: 'P0-16' },
    ];
    const placeholderReport = [];
    for (const pg of p0CustomerPages) {
      await page.goto(`${BASE}/#${pg.p}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      const b = await page.locator('body').innerText().catch(() => '');
      const ph = isPlaceholderPage(b);
      placeholderReport.push({ page: pg.id, path: pg.p, p0: pg.p0, isPlaceholder: ph });
      fact(`p0check.${pg.id}(${pg.p0})`, ph ? '占位页' : '已实现');
    }
    fact('p0check.report', placeholderReport);
    const phList = placeholderReport.filter((r) => r.isPlaceholder).map((r) => r.page);
    check('【已修复】PRD P0-12/13/14/15/16 要求的 13 个客户端页面全部已实现',
      phList.length === 0, `占位页：${phList.join(', ') || '无'}（共 ${placeholderReport.length} 页抽查）`);

    // 3.3 断点一：客户验收工单（UI 端到端）
    await page.goto(`${BASE}/#/customer/work-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await waitTable(page);
    const pendingConfirmRow = page.locator('tbody tr.el-table__row', { hasText: '待验收' }).first();
    const hasPendingConfirm = (await pendingConfirmRow.count()) > 0;
    fact('customer.orderList.hasPendingConfirmRow', hasPendingConfirm);
    check('【断点一】客户工单列表存在「待验收」工单可供验收', hasPendingConfirm, `found=${hasPendingConfirm}`);
    if (hasPendingConfirm) {
      await pendingConfirmRow.click();
      await page.waitForTimeout(1500);
      const detailBody = await page.locator('body').innerText().catch(() => '');
      fact('customer.orderDetail.body.head', detailBody.replace(/\s+/g, ' ').slice(0, 200));
      const hasAcceptBtn = await hasBtn(page, '验收通过');
      fact('customer.orderDetail.hasAcceptBtn', hasAcceptBtn);
      check('【断点一】客户工单详情页出现「验收通过」按钮（非占位）', hasAcceptBtn, `hasAccept=${hasAcceptBtn}`);
      if (hasAcceptBtn) {
        await page.getByRole('button', { name: '验收通过' }).click();
        await page.waitForTimeout(700);
        const dlg = page.locator('.el-dialog').first();
        const dlgVisible = await dlg.isVisible().catch(() => false);
        fact('customer.accept.dialogVisible', dlgVisible);
        await page.locator('.el-dialog__footer button').last().click();
        await page.waitForTimeout(1600);
        const badgeAfter = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
        fact('customer.orderDetail.badgeAfterAccept', badgeAfter);
        check('【断点一】点击验收通过后工单状态变「已完成」', badgeAfter.includes('已完成'), badgeAfter);
        await shot(page, '13-customer-order-accepted');
      }
    } else {
      check('【断点一】客户工单详情页出现「验收通过」按钮（非占位）', false, '未找到待验收工单');
    }

    // 数据层验收能力（确认 api 已就绪）
    const apiAcceptExists = await page.evaluate(async () => {
      // @ts-ignore
      const mod = await import('/src/api/index.ts');
      return typeof mod.customerApi.acceptWorkOrder === 'function'
        && typeof mod.customerApi.getPendingBindings === 'function';
    });
    fact('customer.api.acceptWorkOrderExists', apiAcceptExists);
    check('客户侧验收 / 绑定确认 API 已在数据层实现', apiAcceptExists === true, `exists=${apiAcceptExists}`);

    // 3.4 断点二：客户确认绑定（UI 端到端）
    await page.goto(`${BASE}/#/customer/bindings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await waitTable(page);
    const bindBody = await page.locator('body').innerText().catch(() => '');
    const bindIsPlaceholder = isPlaceholderPage(bindBody);
    fact('customer.bindings.isPlaceholder', bindIsPlaceholder);
    check('【断点二】客户「绑定确认」页已实现（非占位）', !bindIsPlaceholder, `占位=${bindIsPlaceholder}`);
    const beforePending = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
    fact('customer.bindings.rowsBefore', beforePending);
    // ⚠️ 操作列 fixed:'right'，EP 会额外渲染一份固定列克隆，原单元格被隐藏。
    //    用 page.locator('button', ...).first() 会命中隐藏原件导致点击超时，
    //    必须限定在可见的表格行内。
    const confirmBtn = page
      .locator('.el-table__body-wrapper tbody tr.el-table__row')
      .first()
      .locator('button', { hasText: '确认' });
    const hasConfirmBtn = (await confirmBtn.count()) > 0;
    fact('customer.bindings.hasConfirmBtn', hasConfirmBtn);
    check('【断点二】绑定确认页存在「确认」按钮（绑定申报线第 2 环可达）', hasConfirmBtn, `found=${hasConfirmBtn}`);
    if (hasConfirmBtn) {
      await confirmBtn.click();
      await page.waitForTimeout(700);
      await page.locator('.el-dialog__footer button').last().click();
      await page.waitForTimeout(1600);
      const afterPending = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
      fact('customer.bindings.rowsAfter', afterPending);
      check('【断点二】确认一条绑定后列表条数减少（闭环成功）', afterPending < beforePending, `before=${beforePending} after=${afterPending}`);
      await shot(page, '14-customer-binding-confirmed');
    }

    const pendingBindings = await page.evaluate(async () => {
      // @ts-ignore
      const { customerApi } = await import('/src/api/index.ts');
      try {
        const r = await customerApi.getPendingBindings();
        return Array.isArray(r) ? r.length : -1;
      } catch (e) {
        return `ERR:${e && e.message ? e.message : e}`;
      }
    });
    fact('customer.api.pendingBindingsCount', pendingBindings);

    /* ============================================================
     * 用例组 4 — 入驻审核线
     * ============================================================ */
    console.log('\n========== 组 4：入驻审核线 ==========');
    await logout(page);
    await login(page, 'platform', '入驻审核员·林岚');
    fact('reviewer.landing', page.url().replace(BASE, ''));

    await page.goto(`${BASE}/#/platform/review/applications`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const appTotal = await readTotal(page);
    fact('review.applications.total', appTotal);
    check('入驻申请列表 9 条', appTotal === 9, `实测 ${appTotal}`);
    await shot(page, '15-platform-applications');

    await page.goto(`${BASE}/#/platform/review/applications/ONB-2026-0001`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.status-card__actions button', { timeout: 18000 }).catch(() => {});
    await page.waitForTimeout(700);

    const badgeBefore = await page.locator('.hi-badge').first().innerText().catch(() => '');
    fact('review.ONB0001.badgeBefore', badgeBefore);
    check('ONB-2026-0001 初始态 = 待初审', badgeBefore.includes('待初审'), badgeBefore);

    const tlBeforeReview = await page.locator('.el-timeline-item').count();
    fact('review.ONB0001.timelineBefore', tlBeforeReview);

    const reviewBtns = await buttonTexts(page, '.status-card__actions');
    fact('review.ONB0001.buttons', reviewBtns);
    check('审核页有「通过初审」按钮', reviewBtns.some((t) => t.includes('通过初审')), reviewBtns.join('/'));
    check('审核页 PENDING_PRIMARY 态的整改入口是「退回补充」',
      reviewBtns.some((t) => t.includes('退回补充')), reviewBtns.join('/'));

    // 退回补充：不填原因按钮应 disabled
    await page.getByRole('button', { name: '退回补充' }).click();
    await page.waitForTimeout(900);
    const reviewConfirmBtn = page.locator('.el-dialog__footer button').last();
    const dis1 = await reviewConfirmBtn.isDisabled();
    fact('review.rectifyEmpty.confirmDisabled', dis1);
    check('「退回补充」不填原因时确定按钮 disabled', dis1 === true, `disabled=${dis1}`);
    await shot(page, '16-review-rectify-validate');
    await page.locator('.el-dialog__footer button').first().click();
    await page.waitForTimeout(600);

    // 通过初审 → 状态徽标与时间轴是否同步
    await page.getByRole('button', { name: '通过初审' }).click();
    await page.waitForTimeout(900);
    const dlgOpen = await page.locator('.el-dialog').first().isVisible().catch(() => false);
    fact('review.approve.dialogOpen', dlgOpen);
    if (dlgOpen) {
      // 备注可空可空，尝试直接确定
      const btns = await page.locator('.el-dialog__footer button').allInnerTexts();
      fact('review.approve.dialogButtons', btns);
      await page.locator('.el-dialog__footer button').last().click();
      await page.waitForTimeout(1800);
    }
    const badgeAfter = await page.locator('.hi-badge').first().innerText().catch(() => '');
    fact('review.ONB0001.badgeAfter', badgeAfter);
    check('点「通过初审」后状态徽标变化（待初审 → 待复审/已通过）',
      badgeAfter !== badgeBefore, `before=${badgeBefore} after=${badgeAfter}`);

    const tlAfterReview = await page.locator('.el-timeline-item').count();
    fact('review.ONB0001.timelineAfter', tlAfterReview);
    check('通过初审后审核时间轴同步新增记录',
      tlAfterReview > tlBeforeReview, `before=${tlBeforeReview} after=${tlAfterReview}`);
    await shot(page, '17-review-approved');

    // PENDING_SECONDARY 态的「标记整改」
    await page.goto(`${BASE}/#/platform/review/applications/ONB-2026-0008`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.status-card__actions button', { timeout: 18000 }).catch(() => {});
    await page.waitForTimeout(700);
    const b8 = await buttonTexts(page, '.status-card__actions');
    fact('review.ONB0008.buttons', b8);
    check('ONB-2026-0008（PENDING_SECONDARY）有「标记整改」按钮',
      b8.some((t) => t.includes('标记整改')), b8.join('/'));
    await page.getByRole('button', { name: '标记整改' }).click();
    await page.waitForTimeout(900);
    const dis8 = await page.locator('.el-dialog__footer button').last().isDisabled().catch(() => null);
    fact('review.markRectify.confirmDisabled', dis8);
    check('「标记整改」不填原因时确定按钮 disabled', dis8 === true, `disabled=${dis8}`);
    await page.locator('.el-dialog__footer button').first().click().catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, '18-review-mark-rectify');

    /* ============================================================
     * 用例组 5 — 跨端越权拦截
     * ============================================================ */
    console.log('\n========== 组 5：跨端越权拦截 ==========');

    // 5.1 未登录
    await logout(page);
    for (const p of ['/platform/devices', '/vendor/work-orders', '/customer/devices', '/platform/review/applications']) {
      await page.goto(`${BASE}/#${p}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      const ok = page.url().includes('/login') && page.url().includes('redirect');
      check(`未登录访问 ${p} 被重定向到登录页且带 redirect`, ok, page.url().replace(BASE, ''));
    }

    // 5.2 客户访问平台页
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    for (const p of ['/platform/dashboard', '/platform/devices', '/platform/review/applications']) {
      await page.goto(`${BASE}/#${p}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      check(`客户访问 ${p} 被拦到 403`, page.url().includes('/403'), page.url().replace(BASE, ''));
    }
    await shot(page, '19-customer-to-platform-403');

    // 5.3 客户访问厂家页
    await page.goto(`${BASE}/#/vendor/devices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    check('客户访问 /vendor/devices 被拦到 403', page.url().includes('/403'), page.url().replace(BASE, ''));

    await logout(page);

    // 5.4 厨具厂家访问物联网专属页
    await login(page, 'vendor', '厨具厂家·福州华厨设备（管理员）');
    await page.goto(`${BASE}/#/vendor/components`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    check('厨具厂家访问 /vendor/components（物联网专属）被弹回 dashboard',
      page.url().includes('/vendor/dashboard'), page.url().replace(BASE, ''));
    await shot(page, '20-cookware-components-guard');

    await page.goto(`${BASE}/#/platform/devices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    check('厨具厂家访问 /platform/devices 被拦到 403', page.url().includes('/403'), page.url().replace(BASE, ''));

    await logout(page);

    // 5.5 物联网厂家访问厨具专属页
    await login(page, 'vendor', '物联网厂家·厦门智联感知（管理员）');
    await page.goto(`${BASE}/#/vendor/models`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    check('物联网厂家访问 /vendor/models（厨具专属）被弹回 dashboard',
      page.url().includes('/vendor/dashboard'), page.url().replace(BASE, ''));

    // 5.6 厂家之间：厨具厂家手输物联网厂家的设备 URL（数据层验证，非路由拦截）
    // ⚠️ 注意：此刻登录态是厨具厂家，platformApi.getDeviceList 也会被自身 scope 收口，
    //    所以「他厂设备」必须用 mock 原始集合 + 对照厨具 scope 来定位，不能拿平台口取全量。
    await logout(page);
    await login(page, 'vendor', '厨具厂家·福州华厨设备（管理员）');
    const crossVendor = await page.evaluate(async () => {
      // @ts-ignore
      const { vendorApi } = await import('/src/api/index.ts');
      // @ts-ignore
      const { getDb } = await import('/src/mock/db.ts');
      const db = getDb();
      const mine = await vendorApi.getDeviceList({ page: 1, pageSize: 200 });
      const mineSns = new Set((mine.list || []).map((d) => d.sn));
      // 他厂设备：iot 型号且不属于本厂可见集合
      const foreign = db.devices.find((d) => d.modelCode.startsWith('IOT') && !mineSns.has(d.sn));
      if (!foreign) return { skipped: true, reason: '未找到他厂设备' };
      let detail = null;
      let err = null;
      try {
        detail = await vendorApi.getDeviceDetail(foreign.sn);
      } catch (e) {
        err = String(e && e.message ? e.message : e);
      }
      // 顺带验证：他厂客户是否可见
      const foreignWorkOrder = db.workOrders.find((o) => o.vendorId && o.vendorId !== 'TEN-0001');
      let woErr = null;
      let woData = null;
      if (foreignWorkOrder) {
        try {
          woData = await vendorApi.getWorkOrderDetail(foreignWorkOrder.code);
        } catch (e) {
          woErr = String(e && e.message ? e.message : e);
        }
      }
      return {
        sn: foreign.sn,
        deviceDetailReturned: detail ? (detail.device ? detail.device.sn : 'no-device-field') : null,
        deviceErr: err,
        foreignWorkOrderCode: foreignWorkOrder ? foreignWorkOrder.code : null,
        workOrderReturned: woData ? (woData.order ? woData.order.code : 'no-order-field') : null,
        workOrderErr: woErr,
      };
    });
    fact('vendor.crossVendorProbe', crossVendor);
    check('【核心】厨具厂家在数据层取物联网厂家设备详情被拒',
      crossVendor.skipped ? false : crossVendor.deviceErr !== null && crossVendor.deviceDetailReturned === null,
      JSON.stringify(crossVendor).slice(0, 240));
    check('【核心】厨具厂家在数据层取物联网厂家工单详情被拒',
      crossVendor.skipped ? false : crossVendor.workOrderErr !== null && crossVendor.workOrderReturned === null,
      JSON.stringify(crossVendor).slice(0, 240));

    const vSn = crossVendor.sn;
    if (vSn) {
      await page.goto(`${BASE}/#/vendor/devices/${vSn}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const vBody = await page.locator('body').innerText().catch(() => '');
      fact('vendor.crossVendorUrlShowsSn', vBody.includes(vSn));
      fact('vendor.crossVendorUrlPageHead', vBody.replace(/\s+/g, ' ').slice(0, 160));
      check('厂家手输他厂设备 URL 时页面不泄露该 SN 数据', vBody.includes(vSn) === false, `页面含该 SN=${vBody.includes(vSn)}`);
      await shot(page, '21-vendor-cross-vendor-url');
    }

    /* ============================================================
     * 用例组 6 — 三入口视觉统一性（取样式令牌做客观比对）
     * ============================================================ */
    console.log('\n========== 组 6：三入口视觉统一性（样式令牌客观比对） ==========');

    const probeVisual = async (label) => {
      const v = await page.evaluate(() => {
        const pick = (sel, props) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          const out = {};
          props.forEach((p) => { out[p] = cs.getPropertyValue(p); });
          return out;
        };
        const cardProps = ['background-color', 'border-radius', 'box-shadow', 'border-color', 'padding'];
        const badgeProps = ['background-color', 'color', 'border-radius', 'font-size', 'font-weight', 'border-color'];
        const tableProps = ['background-color', 'border-color', 'font-size'];
        const layout = pick('.hi-layout', ['background-color', 'font-family', 'font-size']);
        const sidenav = pick('.hi-sidenav', ['background-color', 'width', 'font-size']);
        const header = pick('.hi-header', ['background-color', 'height', 'border-color', 'box-shadow']);
        return {
          url: location.hash,
          layout,
          sidenav,
          header,
          card: pick('.hi-card, .el-card, .status-card', cardProps),
          statCard: pick('.hi-stat-card', cardProps),
          badge: pick('.hi-badge', badgeProps),
          table: pick('.el-table', tableProps),
          tableHeader: pick('.el-table__header th', ['background-color', 'color', 'font-size', 'font-weight']),
          cssVars: {
            primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
            success: getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim(),
            warning: getComputedStyle(document.documentElement).getPropertyValue('--color-warning').trim(),
            danger: getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim(),
            radius: getComputedStyle(document.documentElement).getPropertyValue('--radius-base').trim(),
            textTitle: getComputedStyle(document.documentElement).getPropertyValue('--color-text-title').trim(),
          },
          fontFamilyBody: getComputedStyle(document.body).fontFamily,
          badgeCount: document.querySelectorAll('.hi-badge').length,
          hasHardcodedShadow: Array.from(document.querySelectorAll('.el-card, .hi-card')).some((el) => {
            const s = getComputedStyle(el).boxShadow;
            return s && s !== 'none' && /rgba?\(/.test(s);
          }),
        };
      });
      fact(`visual.${label}`, v);
      return v;
    };

    await logout(page);
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await shot(page, '22-entry');
    await probeVisual('entry');

    await login(page, 'platform', '平台超级管理员');
    const vPlatform = await probeVisual('platform');
    await shot(page, '23-visual-platform');

    await logout(page);
    await login(page, 'vendor', '厨具厂家·福州华厨设备（管理员）');
    const vVendor = await probeVisual('vendor');
    await shot(page, '24-visual-vendor');

    await logout(page);
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    const vCustomer = await probeVisual('customer');
    await shot(page, '25-visual-customer');

    // 客观比对：三端的卡片圆角/阴影/字体/表格头/徽标是否同源
    const cmp = (a, b, name) => {
      const keys = ['background-color', 'border-radius', 'box-shadow', 'border-color', 'padding'];
      const diffs = [];
      (keys || []).forEach(() => {});
      if (a && b) {
        Object.keys(a).forEach((k) => {
          if (a[k] !== b[k]) diffs.push(`${k}: ${a[k]} vs ${b[k]}`);
        });
      }
      fact(`visual.diff.${name}`, diffs.length ? diffs : '一致');
      return diffs;
    };
    cmp(vPlatform.card, vVendor.card, 'card.platform_vs_vendor');
    cmp(vPlatform.card, vCustomer.card, 'card.platform_vs_customer');
    cmp(vVendor.card, vCustomer.card, 'card.vendor_vs_customer');

    const badgeCmp = (a, b, name) => {
      const diffs = [];
      if (a && b) Object.keys(a).forEach((k) => { if (a[k] !== b[k]) diffs.push(`${k}: ${a[k]} vs ${b[k]}`); });
      fact(`visual.diff.badge.${name}`, diffs.length ? diffs : '一致');
    };
    badgeCmp(vPlatform.badge, vVendor.badge, 'platform_vs_vendor');
    badgeCmp(vPlatform.badge, vCustomer.badge, 'platform_vs_customer');

    const tableCmp = (a, b, name) => {
      const diffs = [];
      if (a && b) Object.keys(a).forEach((k) => { if (a[k] !== b[k]) diffs.push(`${k}: ${a[k]} vs ${b[k]}`); });
      fact(`visual.diff.tableHeader.${name}`, diffs.length ? diffs : '一致');
    };
    tableCmp(vPlatform.tableHeader, vVendor.tableHeader, 'platform_vs_vendor');
    tableCmp(vPlatform.tableHeader, vCustomer.tableHeader, 'platform_vs_customer');

    check('三端 CSS 令牌（primary/success/warning/danger/radius）完全一致',
      JSON.stringify(vPlatform.cssVars) === JSON.stringify(vVendor.cssVars)
      && JSON.stringify(vPlatform.cssVars) === JSON.stringify(vCustomer.cssVars),
      JSON.stringify({ p: vPlatform.cssVars, v: vVendor.cssVars, c: vCustomer.cssVars }));
    check('三端 body 字体族一致',
      vPlatform.fontFamilyBody === vVendor.fontFamilyBody && vPlatform.fontFamilyBody === vCustomer.fontFamilyBody,
      `${vPlatform.fontFamilyBody} | ${vVendor.fontFamilyBody} | ${vCustomer.fontFamilyBody}`);

    /* ============================================================
     * 用例组 7 — 缺陷A/B 回归（第二轮新增，重点对象）
     *   缺陷A：h('el-button', ...) 渲染成未解析自定义元素 → 按钮无点击行为
     *   缺陷B：keep-alive 列表页回场不刷新 → 别页改完数据回列表看到旧数据
     * ============================================================ */
    console.log('\n========== 组 7：缺陷A/B 回归（重点） ==========');

    // 重新登录客户（mock 库刷新即复位，确保 BD-9001 回到待确认态）
    await logout(page);
    await login(page, 'customer', '福州第一中学食堂（管理员）');

    // —— 7.0 缺陷B 前置：记录确认绑定前的资产视图条数 ——
    await page.goto(`${BASE}/#/customer/devices`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const devicesBeforeBind = await waitTotalStable(page);
    fact('defectB.devicesBeforeConfirm', devicesBeforeBind);

    // —— 7.1 缺陷A：按钮 DOM 形态断言（未解析自定义元素 = 无点击行为）——
    await page.goto(`${BASE}/#/customer/bindings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1600);
    await waitTable(page);

    const btnDom = await page.evaluate(() => {
      const unresolved = Array.from(document.querySelectorAll('el-button'));
      const realBtns = Array.from(document.querySelectorAll('button.el-button'));
      const rows = document.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row');
      const rowBtns = rows.length
        ? Array.from(rows[0].querySelectorAll('button')).map((b) => ({
            tag: b.tagName.toLowerCase(),
            cls: b.className,
            text: (b.innerText || '').replace(/\s+/g, ''),
            hasListenerProbe: true,
          }))
        : [];
      return {
        unresolvedElButtonCount: unresolved.length,
        unresolvedSamples: unresolved.slice(0, 5).map((e) => e.outerHTML.slice(0, 120)),
        realButtonCount: realBtns.length,
        firstRowButtons: rowBtns,
      };
    });
    fact('defectA.bindingPageDom', btnDom);
    check('【缺陷A】绑定确认页无未解析的 <el-button> 自定义元素',
      btnDom.unresolvedElButtonCount === 0,
      `未解析 ${btnDom.unresolvedElButtonCount} 个：${JSON.stringify(btnDom.unresolvedSamples).slice(0, 200)}`);
    check('【缺陷A】绑定确认页渲染出真实 <button class="el-button">（含确认/拒绝）',
      btnDom.realButtonCount >= 2, `button.el-button 共 ${btnDom.realButtonCount} 个`);
    check('【缺陷A】表格行内按钮是 button 标签而非 el-button',
      btnDom.firstRowButtons.length > 0 && btnDom.firstRowButtons.every((b) => b.tag === 'button'),
      JSON.stringify(btnDom.firstRowButtons.map((b) => `${b.tag}:${b.text}`)));

    // —— 7.2 缺陷A：抽验 device-list 的「详情/报修」与 threshold-list 的开关 ——
    await page.goto(`${BASE}/#/customer/devices`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const devBtnDom = await page.evaluate(() => {
      const unresolved = document.querySelectorAll('el-button').length;
      const real = document.querySelectorAll('button.el-button').length;
      const rows = document.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row');
      const firstRowBtns = rows.length
        ? Array.from(rows[0].querySelectorAll('button')).map((b) => (b.innerText || '').replace(/\s+/g, ''))
        : [];
      return { unresolved, real, firstRowBtns };
    });
    fact('defectA.deviceListDom', devBtnDom);
    check('【缺陷A抽验】客户设备列表无未解析 <el-button>', devBtnDom.unresolved === 0, `未解析 ${devBtnDom.unresolved} 个`);
    check('【缺陷A抽验】客户设备列表行内有可点按钮（详情/报修）',
      devBtnDom.firstRowBtns.length > 0, JSON.stringify(devBtnDom.firstRowBtns));

    await page.goto(`${BASE}/#/customer/thresholds`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    const swDom = await page.evaluate(() => {
      const switches = Array.from(document.querySelectorAll('.el-switch'));
      const unresolvedSwitch = Array.from(document.querySelectorAll('el-switch')).length;
      return {
        realSwitchCount: switches.length,
        unresolvedSwitchCount: unresolvedSwitch,
        firstSwitchTag: switches[0] ? switches[0].tagName.toLowerCase() : null,
      };
    });
    fact('defectA.thresholdSwitchDom', swDom);
    check('【缺陷A抽验】阈值页开关是真实 .el-switch（非未解析 el-switch）',
      swDom.unresolvedSwitchCount === 0 && swDom.realSwitchCount > 0,
      `真实 ${swDom.realSwitchCount} / 未解析 ${swDom.unresolvedSwitchCount}`);

    // —— 7.3 缺陷B：确认绑定 → 回「我的设备」→ 条数应 +1（keep-alive 回场补刷）——
    await page.goto(`${BASE}/#/customer/bindings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await waitTable(page);
    const bindRowsBefore = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
    fact('defectB.bindRowsBefore', bindRowsBefore);

    // 取出该行的设备 SN，供后续断言出现在资产视图
    const bindSn = await page.evaluate(() => {
      const row = document.querySelector('.el-table__body-wrapper tbody tr.el-table__row');
      if (!row) return null;
      const tds = row.querySelectorAll('td');
      // 第 2 列是设备 SN（列序：设备名称 / 设备 SN / 型号 …）
      return tds[1] ? tds[1].innerText.trim() : null;
    });
    fact('defectB.bindSn', bindSn);

    const bindConfirmBtn = page
      .locator('.el-table__body-wrapper tbody tr.el-table__row')
      .first()
      .locator('button', { hasText: '确认' });
    const canClickConfirm = (await bindConfirmBtn.count()) > 0;
    check('【缺陷B】绑定确认页有可点的「确认」按钮', canClickConfirm, `found=${canClickConfirm}`);

    if (canClickConfirm && bindSn) {
      await bindConfirmBtn.click();
      await page.waitForTimeout(800);
      const dlgVisible = await page.locator('.el-dialog').first().isVisible().catch(() => false);
      fact('defectB.confirmDialogVisible', dlgVisible);
      check('【缺陷B】点「确认」弹出确认对话框（按钮真有行为）', dlgVisible, `dialog=${dlgVisible}`);
      await page.locator('.el-dialog__footer button').last().click();
      await page.waitForTimeout(2000);

      const bindRowsAfter = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
      fact('defectB.bindRowsAfter', bindRowsAfter);
      check('【缺陷B】确认后待确认列表清空（绑定生效）', bindRowsAfter < bindRowsBefore,
        `before=${bindRowsBefore} after=${bindRowsAfter}`);

      // 数据层：该绑定应已变 ACTIVE
      const bindingStatus = await page.evaluate(async (sn) => {
        // @ts-ignore
        const { getDb } = await import('/src/mock/db.ts');
        const db = getDb();
        const b = db.bindings.find((x) => x.deviceSn === sn && x.type === 'OWNERSHIP');
        return b ? b.status : 'NOT_FOUND';
      }, bindSn);
      fact('defectB.bindingStatusAfterConfirm', bindingStatus);
      check('【缺陷B】数据层该绑定状态已变 ACTIVE', bindingStatus === 'ACTIVE', `status=${bindingStatus}`);

      // ★ 核心：不刷新页面，仅 hash 路由回列表，验证 keep-alive 回场补刷
      await page.goto(`${BASE}/#/customer/devices`, { waitUntil: 'networkidle' });
      await waitTable(page);
      const devicesAfterBind = await waitTotalStable(page);
      fact('defectB.devicesAfterConfirm', devicesAfterBind);
      check('【缺陷B·核心】确认绑定后回「我的设备」条数 12 → 13（keep-alive 回场补刷生效）',
        devicesAfterBind === devicesBeforeBind + 1,
        `before=${devicesBeforeBind} after=${devicesAfterBind} 期望=${devicesBeforeBind + 1}`);

      const snCells = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.el-table__body-wrapper tbody tr.el-table__row td:first-child'))
          .map((td) => td.innerText.trim()));
      fact('defectB.deviceSnCells', snCells);
      check(`【缺陷B·核心】${bindSn} 出现在资产视图列表`, snCells.includes(bindSn),
        `列表 ${snCells.length} 台，含该 SN=${snCells.includes(bindSn)}`);
      await shot(page, '26-defectB-devices-after-confirm');
    }

    // —— 7.4 缺陷A：拒绝流程（不填原因应禁用 → 填写 → RELEASED）——
    // ⚠️ page.reload() 会同时重置 mock 库与 pinia 登录态（无持久化），
    //    所以 reload 之后必须重新登录，否则会被路由守卫弹到 /login，
    //    绑定页根本不会渲染（表现为 0 行），那是测试自身的 bug 而非应用缺陷。
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    await page.goto(`${BASE}/#/customer/bindings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1600);
    await waitTable(page);
    const rejectRowsBefore = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
    fact('defectA.rejectRowsBefore', rejectRowsBefore);

    const rejectBtn = page
      .locator('.el-table__body-wrapper tbody tr.el-table__row')
      .first()
      .locator('button', { hasText: '拒绝' });
    const canClickReject = (await rejectBtn.count()) > 0;
    check('【缺陷A】绑定确认页有可点的「拒绝」按钮', canClickReject, `found=${canClickReject}`);

    if (canClickReject) {
      await rejectBtn.click();
      await page.waitForTimeout(900);
      const rejectDlg = await page.locator('.el-dialog').first().isVisible().catch(() => false);
      fact('defectA.rejectDialogVisible', rejectDlg);
      check('【缺陷A】点「拒绝」弹出原因对话框（按钮真有行为）', rejectDlg, `dialog=${rejectDlg}`);

      const rejectConfirm = page.locator('.el-dialog__footer button').last();
      const disBefore = await rejectConfirm.isDisabled().catch(() => null);
      fact('defectA.rejectConfirmDisabledBefore', disBefore);
      check('【缺陷A】拒绝时不填原因，「确定」禁用', disBefore === true, `disabled=${disBefore}`);

      const reasonTa = page.locator('.el-dialog textarea').first();
      await reasonTa.fill('QA 复测：厂家申报信息与实际情况不符，退回重新申报');
      await page.waitForTimeout(600);
      const disAfter = await rejectConfirm.isDisabled().catch(() => null);
      fact('defectA.rejectConfirmDisabledAfter', disAfter);
      check('【缺陷A】填写原因后「确定」可用', disAfter === false, `disabled=${disAfter}`);

      await rejectConfirm.click();
      await page.waitForTimeout(2000);
      const rejectRowsAfter = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
      fact('defectA.rejectRowsAfter', rejectRowsAfter);
      check('【缺陷A】拒绝后该绑定从待确认列表消失', rejectRowsAfter < rejectRowsBefore,
        `before=${rejectRowsBefore} after=${rejectRowsAfter}`);

      const bindingStatusAfterReject = await page.evaluate(async () => {
        // @ts-ignore
        const { getDb } = await import('/src/mock/db.ts');
        const db = getDb();
        const b = db.bindings.find((x) => x.id === 'BD-9001') || db.bindings[0];
        return b ? { id: b.id, status: b.status } : 'NOT_FOUND';
      });
      fact('defectA.bindingStatusAfterReject', bindingStatusAfterReject);
      check('【缺陷A】数据层该绑定状态已变 RELEASED',
        bindingStatusAfterReject !== 'NOT_FOUND' && bindingStatusAfterReject.status === 'RELEASED',
        JSON.stringify(bindingStatusAfterReject));
      await shot(page, '27-defectA-binding-rejected');
    }

    // —— 7.5 工单闭环补验：客户验收驳回（必填原因）→ 退回处理中 ——
    await logout(page);
    await login(page, 'vendor', '厨具厂家·福州华厨设备（管理员）');
    await page.goto(`${BASE}/#/vendor/work-orders/WO-2026-0031`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.order-actions button, .hi-page', { timeout: 18000 }).catch(() => {});
    await page.waitForTimeout(900);
    const vBadge0 = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    fact('rejectFlow.vendorBadgeInitial', vBadge0);
    // 若已是待验收（上一轮跑过），直接进客户侧；否则先接单+反馈推到待验收
    if (!vBadge0.includes('待验收')) {
      if (vBadge0.includes('待接单')) {
        await page.getByRole('button', { name: '接单', exact: true }).first().click();
        await page.waitForTimeout(800);
        await page.locator('.el-dialog textarea').first().fill('QA：接单');
        await page.locator('.el-dialog__footer button').last().click();
        await page.waitForTimeout(2000);
      }
      await page.getByRole('button', { name: '反馈处理结果' }).click();
      await page.waitForTimeout(800);
      await page.locator('.el-dialog textarea').first().fill('QA：处理完成');
      await page.locator('.el-dialog__footer button').last().click();
      await page.waitForTimeout(2200);
    }
    const vBadge1 = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    fact('rejectFlow.vendorBadgeBeforeCustomer', vBadge1);
    check('【驳回前置】WO-2026-0031 已被推到「待验收」', vBadge1.includes('待验收'), vBadge1);

    // ⚠️ 必须用 switchAccount（不刷新）而非 logout（会 reload 重置 mock），
    //    否则客户侧看到的又是初始态「待接单」，跨入口延续就验不出来。
    await switchAccount(page, 'customer', '福州第一中学食堂（管理员）');
    await page.goto(`${BASE}/#/customer/work-orders/WO-2026-0031`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.hi-page', { timeout: 18000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const custBadge = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    fact('rejectFlow.customerBadge', custBadge);
    check('【跨入口延续】客户侧看到 WO-2026-0031 为「待验收」（同一 SPA 会话，未刷新）',
      custBadge.includes('待验收'), custBadge);

    const rejectOrderBtn = page.getByRole('button', { name: /验收驳回|驳回/ }).first();
    const hasRejectOrder = (await rejectOrderBtn.count()) > 0;
    check('【驳回】客户工单详情有「验收驳回」按钮', hasRejectOrder, `found=${hasRejectOrder}`);
    if (hasRejectOrder) {
      await rejectOrderBtn.click();
      await page.waitForTimeout(900);
      const roConfirm = page.locator('.el-dialog__footer button').last();
      const roDisBefore = await roConfirm.isDisabled().catch(() => null);
      fact('rejectFlow.confirmDisabledBefore', roDisBefore);
      check('【驳回】不填驳回原因时「确定」禁用', roDisBefore === true, `disabled=${roDisBefore}`);
      await page.locator('.el-dialog textarea').first().fill('QA：现场未按约定时间上门，退回重新处理');
      await page.waitForTimeout(600);
      const roDisAfter = await roConfirm.isDisabled().catch(() => null);
      check('【驳回】填写原因后「确定」可用', roDisAfter === false, `disabled=${roDisAfter}`);
      await roConfirm.click();
      await page.waitForTimeout(2200);
      const badgeAfterReject = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
      fact('rejectFlow.badgeAfterReject', badgeAfterReject);
      check('【驳回】客户驳回后工单退回「处理中」', badgeAfterReject.includes('处理中'), badgeAfterReject);
      await shot(page, '28-defectA-order-rejected-back-to-progress');
    }

    /* ============================================================
     * 用例组 8 — 控制台错误（分桶，不静默过滤）
     * ============================================================ */
    console.log('\n========== 组 8：控制台错误 ==========');
    const noise = /favicon/i;
    const realConsole = consoleErrors.filter((e) => !noise.test(e));
    const realFailed = failedRequests.filter((e) => !noise.test(e));
    fact('console.errorCount', realConsole.length);
    fact('console.errorSamples', realConsole.slice(0, 12));
    fact('pageerror.count', pageErrors.length);
    fact('pageerror.samples', pageErrors.slice(0, 8));
    fact('requestfailed.count', realFailed.length);
    fact('requestfailed.samples', realFailed.slice(0, 8));
    check('全程 console error = 0', realConsole.length === 0, `${realConsole.length} 条：${realConsole.slice(0, 3).join(' | ').slice(0, 300)}`);
    check('全程 pageerror = 0', pageErrors.length === 0, `${pageErrors.length} 条：${pageErrors.slice(0, 3).join(' | ').slice(0, 300)}`);
    check('全程 requestfailed = 0', realFailed.length === 0, `${realFailed.length} 条：${realFailed.slice(0, 3).join(' | ').slice(0, 300)}`);
  } catch (e) {
    check('脚本执行未抛异常', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  } finally {
    await browser.close();
  }

  /* ============ 汇总 ============ */
  const failed = results.filter((r) => !r.ok);
  console.log('\n══════════════════════════════════════');
  console.log(`QA 断言：共 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
  console.log(`截图目录：${OUT}`);
  if (failed.length) {
    console.log('\n失败明细：');
    failed.forEach((f) => console.log(`  FAIL | ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'facts.json'), JSON.stringify({ facts, results }, null, 2), 'utf8');
  console.log(`\n实测事实已落盘：${path.join(OUT, 'facts.json')}`);
  if (failed.length) process.exitCode = 1;
})();
