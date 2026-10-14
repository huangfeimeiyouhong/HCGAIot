/**
 * 厂家端第三轮 7 个页面 + 平台方工单详情路由 端到端验收（无头 Chrome）
 *
 * 覆盖：
 *   ① 7 个页面逐个打开：非占位、有真实数据、无控制台报错
 *   ② V-10 部件台账：厨具厂家访问仍被弹回 dashboard（守卫有效）
 *   ③ 平台方工单详情路由：手输 URL 不再落 404，能渲染只读详情
 *
 * 运行：node scripts/verify-vendor-p1.cjs
 * 环境：BASE_URL（默认 http://localhost:9900）
 * 截图：screenshots/vendor-p1/
 */
const path = require('node:path');
const fs = require('node:fs');

const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:9900';
const OUT = path.resolve(__dirname, '../screenshots/vendor-p1');

/** 断言累计 */
const results = [];
const facts = {};

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function fact(key, value) {
  facts[key] = value;
  console.log(`  FACT | ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
}

/** 页面级占位标记（与 qa-verify.cjs / verify-client.cjs 同一套措辞） */
const PAGE_PLACEHOLDER_RE =
  /占位实现|占位页|页面占位|第二批交付|第二批实现|第二批开发|待开发|敬请期待|功能建设中|页面建设中/;
const NOT_PLACEHOLDER_HINTS = /仅演示占位|演示占位|占位符|上传占位|占位文本|placeholder/i;

function isPlaceholderPage(text) {
  const t = String(text || '');
  return PAGE_PLACEHOLDER_RE.test(t) && !NOT_PLACEHOLDER_HINTS.test(t);
}

/** 登录 */
async function login(page, role, account) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.goto(`${BASE}/#/login?role=${role}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.locator('.login-card .el-select__wrapper').first().click();
  await page.waitForSelector('.el-select-dropdown__item', { timeout: 10000 });
  await page.locator('.el-select-dropdown__item').filter({ hasText: account }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

/** 登出（整页刷新复位 mock 库，保证各页互不影响） */
async function logout(page) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e)}`));

  try {
    /* ========== ① 厨具厂家：6 个页面 ========== */
    console.log('\n── ① 厨具厂家 6 页 ──');
    await login(page, 'vendor', '厨具厂家·福州华厨设备');

    const cookwarePages = [
      { id: 'V-03', path: '/vendor/models', name: '产品型号档案', shot: '01-vendor-models' },
      { id: 'V-07', path: '/vendor/usage', name: '设备使用情况', shot: '02-vendor-usage' },
      { id: 'V-09', path: '/vendor/alarm-stats', name: '告警统计', shot: '03-vendor-alarm-stats' },
      { id: 'V-11', path: '/vendor/accounts', name: '子账号管理', shot: '04-vendor-accounts' },
      { id: 'V-12', path: '/vendor/performance', name: '履约画像', shot: '05-vendor-performance' },
      { id: 'V-13', path: '/vendor/notifications', name: '通知中心', shot: '06-vendor-notifications' },
    ];

    for (const pg of cookwarePages) {
      const before = errors.length;
      await page.goto(`${BASE}/#${pg.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1800);
      const body = await page.locator('.hi-page').first().innerText().catch(() => '');
      const ph = isPlaceholderPage(body);
      // 「有实质内容」：有表格行 / 图表 canvas / 指标卡 / 描述列表之一
      const hasStructure =
        (await page.locator('.el-table__body-wrapper tbody tr').count()) > 0 ||
        (await page.locator('.hi-base-chart canvas').count()) > 0 ||
        (await page.locator('.hi-stat-card').count()) > 0 ||
        (await page.locator('.hi-desc-list__item').count()) > 0;
      // 图表必须真的画出来（canvas 有尺寸），否则就是「空白图表」
      const canvasCount = await page.locator('.hi-base-chart canvas').count();
      const canvasSized = await page
        .locator('.hi-base-chart canvas')
        .evaluateAll((els) => els.filter((el) => el.width > 0 && el.height > 0).length);
      const statCards = await page.locator('.hi-stat-card').count();
      const tableRows = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
      fact(`${pg.id}.charts`, { canvas: canvasCount, sized: canvasSized, statCards, tableRows });
      check(`${pg.id}「${pg.name}」非占位`, !ph, `${body.length} 字`);
      check(`${pg.id}「${pg.name}」有实质内容`, hasStructure && body.length > 60, `结构=${hasStructure}`);
      // 有 canvas 的页面必须全部渲染出尺寸，不能是空白图表
      check(`${pg.id}「${pg.name}」图表非空白`, canvasCount === 0 || canvasSized === canvasCount,
        canvasCount ? `${canvasSized}/${canvasCount} 张已绘制` : '本页无图表');
      check(`${pg.id}「${pg.name}」无控制台报错`, errors.length === before, `新增 ${errors.length - before} 条`);
      await shot(page, pg.shot);
    }

    /* ========== ② 厨具厂家访问部件台账 → 弹回 dashboard ========== */
    console.log('\n── ② 部件台账守卫（厨具厂家应被弹回）──');
    await page.goto(`${BASE}/#/vendor/components`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const guardUrl = page.url();
    check('厨具厂家访问 /vendor/components 被弹回 dashboard', guardUrl.includes('/vendor/dashboard'), guardUrl.replace(BASE, ''));
    await shot(page, '07-cookware-components-guard');

    await logout(page);

    /* ========== ③ 物联网厂家：部件台账 ========== */
    console.log('\n── ③ 物联网厂家 部件台账 ──');
    await login(page, 'vendor', '物联网厂家·厦门智联感知');
    await page.goto(`${BASE}/#/vendor/components`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const compBody = await page.locator('.hi-page').first().innerText().catch(() => '');
    const compRows = await page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();
    fact('V-10.rows', compRows);
    fact('V-10.bodyLen', compBody.length);
    check('V-10「部件台账」非占位', !isPlaceholderPage(compBody), `${compBody.length} 字`);
    check('V-10「部件台账」有真实数据', compRows > 0, `${compRows} 行`);
    check('V-10 未被守卫拦截', page.url().includes('/vendor/components'), page.url().replace(BASE, ''));
    await shot(page, '08-iot-components');

    // 部件台账不引用被裁剪的厨具本体字段（成本 / 型号参数）
    check('V-10 页面未泄露「成本」字段', !/成本|cost/i.test(compBody), `命中=${/成本|cost/i.test(compBody)}`);

    await logout(page);

    /* ========== ④ 平台方工单详情路由 ========== */
    console.log('\n── ④ 平台方工单详情路由 ──');
    await login(page, 'platform', '平台超级管理员');
    await page.goto(`${BASE}/#/platform/work-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const firstCode = await page
      .locator('.el-table__body-wrapper tbody tr.el-table__row td:first-child')
      .first()
      .innerText()
      .catch(() => '');
    const orderCode = firstCode.trim();
    fact('platform.firstOrderCode', orderCode);

    await page.goto(`${BASE}/#/platform/work-orders/${orderCode}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const detailUrl = page.url();
    const detailBody = await page.locator('.hi-page').first().innerText().catch(() => '');
    fact('platform.orderDetail.bodyHead', detailBody.replace(/\s+/g, ' ').slice(0, 120));
    check('平台方工单详情不再落 404', !/404|页面不存在/.test(detailBody), `url=${detailUrl.replace(BASE, '')}`);

    // ⚠️ 不能按「正文里有没有这几个字」判定：页面顶部的只读提示本身就写着
    //    「…可『标记争议』进入仲裁流程」，按钮就算被删掉，按正文匹配照样 PASS。
    //    只读区块要看真实的 .section-title，动作入口要看真实的按钮列表。
    const sectionTitles = (await page.locator('.section-title').allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
    fact('platform.orderDetail.sections', sectionTitles);
    const hasSection = (kw) => sectionTitles.some((t) => t.includes(kw));
    check('平台方工单详情渲染出只读信息区（工单信息 / 处理进展 / 流转留痕）',
      hasSection('工单信息') && hasSection('处理进展') && hasSection('流转留痕'),
      `sections=${sectionTitles.join('/')}`);

    const detailBtns = (await page.locator('button, .el-button').allInnerTexts())
      .map((t) => t.replace(/\s+/g, ''))
      .filter(Boolean);
    fact('platform.orderDetail.buttons', detailBtns);
    const detailHasBtn = (kw) => detailBtns.some((t) => t === kw || t.includes(kw));
    check('平台方工单详情有「标记争议」按钮', detailHasBtn('标记争议'), `buttons=${detailBtns.join('/')}`);
    check('平台方工单详情无「接单」按钮（只读视角）', !detailHasBtn('接单'), `buttons=${detailBtns.join('/')}`);
    await shot(page, '09-platform-order-detail');

    console.log('\n── ⑤ 控制台汇总 ──');
    check('全程控制台零报错', errors.length === 0, `${errors.length} 条${errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''}`);
    fact('console.errors.count', errors.length);

    fs.writeFileSync(path.join(OUT, 'facts.json'), JSON.stringify({ passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results, facts }, null, 2), 'utf8');
  } catch (e) {
    console.log(`\n💥 脚本执行异常：${String(e).split('\n')[0]}`);
    check('脚本执行未抛异常', false, String(e).split('\n')[0]);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'facts.json'), JSON.stringify({ passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results, facts }, null, 2), 'utf8');
    await shot(page, '99-error');
  } finally {
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    console.log('\n══════════════════════════════════');
    console.log(`通过 ${passed} 项，失败 ${failed} 项`);
    console.log(`截图目录：${OUT}`);
    if (failed) {
      console.log('\n失败明细：');
      results.filter((r) => !r.ok).forEach((r) => console.log(`  ❌ ${r.name} — ${r.detail}`));
    }
    await browser.close();
  }
})();
