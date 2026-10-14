/**
 * 四条主链路端到端验收脚本（无头 Chrome）
 *
 * 覆盖团队 lead 要求的 5 项：
 *   ① 三个入口登录页都能进
 *   ② 各入口首页正常渲染
 *   ③ 工单闭环能点通（客户/厂家侧状态徽标正确变化）
 *   ④ 切到厂家账号后客户/设备列表确实变窄（数据隔离生效）
 *   ⑤ 控制台零报错
 *
 * ⚠️ 必须跑在 Vite dev server 上，不能跑 vite preview 产物：
 *    隔离断言用 probeApiCounts() 在浏览器侧动态 import '/src/api/index.ts'，
 *    该路径只在校验源下可达，对 dist 产物会 404。
 *    运行：npm run dev（另起端口时用 BASE_URL 指定）
 *          BASE_URL=http://localhost:9901 node scripts/verify-flows.cjs
 *
 * 运行：node scripts/verify-flows.cjs
 * 截图输出到 screenshots/
 */
const path = require('node:path');
const fs = require('node:fs');

const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:9900';
const OUT = path.resolve(__dirname, '../screenshots');

/** 断言累计 */
const results = [];
const facts = {};
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

/** 记录实测事实（不算断言，只留证据，便于回溯「当时的真实值是什么」） */
function fact(key, value) {
  facts[key] = value;
  console.log(`  FACT | ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
}

/** 截图 */
async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
}

/** 读顶栏数据范围徽标 */
const readScopeBadge = (page) =>
  page.locator('.hi-scope-badge__text').first().innerText().catch(() => '');

/**
 * 经 api 层取当前登录态可见的设备 / 工单条数。
 *
 * ⚠️ 必须在「已登录」状态下调用：三个 api 模块的可见范围都由登录态推导
 *    （resolveScope(useAuthStore())），登出后取到的是空范围，数字没有意义。
 * ⚠️ 依赖 Vite dev server：动态 import '/src/api/index.ts' 只在校验源下可达，
 *    对 vite preview 产物会 404，故本脚本需跑在 dev server 上。
 * @returns { devices, orders }，取数失败为 -1
 */
async function probeApiCounts(page) {
  return page.evaluate(async () => {
    // @ts-ignore
    const { platformApi } = await import('/src/api/index.ts');
    const pick = async (method) => {
      try {
        const r = await platformApi[method]({ page: 1, pageSize: 1 });
        return typeof r?.total === 'number' ? r.total : -1;
      } catch (e) {
        return -1;
      }
    };
    return {
      devices: await pick('getDeviceList'),
      orders: await pick('getWorkOrderList'),
    };
  });
}

/** 读侧栏菜单项数 */
const readMenuCount = (page) =>
  page.locator('.hi-sidenav .el-menu-item').count();

/** 读表格行数 */
const readRowCount = (page) =>
  page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();

/** 读分页总条数 */
const readTotal = async (page) => {
  const t = await page.locator('.hi-pagination').first().innerText().catch(() => '');
  const m = String(t).match(/共\s*([\d,]+)\s*条/);
  return m ? Number(m[1].replace(/,/g, '')) : -1;
};


/**
 * 稳定轮询读总条数：连续两次读到同一个 > 0 的值才返回。
 * ⚠️ 单次 readTotal 可能在 200ms mock 延迟下读到初始 0，用作动态基线会失真，
 *    所以凡是「拿它当基线再比较」的地方都要走这个稳定版本。
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

/** 等表格渲染完成（v-loading 遮罩消失） */
async function waitTable(page, timeout = 15000) {
  await page.waitForSelector('.el-table__body-wrapper tbody tr.el-table__row', { timeout }).catch(() => {});
  await page.waitForFunction(
    () => !document.querySelector('.el-loading-mask'),
    { timeout: 8000 },
  ).catch(() => {});
  await page.waitForTimeout(350);
}

/**
 * 轮询等待页面内容出现某段文本（EP 固定列是 sticky 渲染，可能比首屏行晚一拍）
 * @returns 命中返回 true
 */
async function waitText(page, text, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const t = await page.locator('.hi-page').innerText().catch(() => '');
    if (t.includes(text)) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

/** 读按钮文本（只取精确文本，避免「待接单」误判为「接单」） */
const hasExactButton = async (page, text) => {
  const texts = await page.locator('button, .el-button').allInnerTexts();
  return texts.some((t) => {
    const n = t.replace(/\s+/g, '');
    const target = text.replace(/\s+/g, '');
    // 全等或结尾匹配：既能容忍 el-button 内的空白，又不会把「待接单」误判为「接单」
    return n === target || n.endsWith(target);
  });
};

/** 登录：填演示账号 → 点登录 → 等落地 */
async function login(page, role, account) {
  // ⚠️ 先跳到入口页再进登录页：仅 hash 变化时 vue-router 复用同一组件实例，
  //    onMounted 不会重跑，Tab 会停在上一次的 role，导致下拉里找不到目标账号
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.goto(`${BASE}/#/login?role=${role}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  // 演示账号下拉已默认选中第一个，这里显式选目标账号
  // 等演示账号下拉拿到数据（异步 200ms 延迟）并默认选中
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.login-card .el-select input');
      return el && el.value && el.value.length > 0;
    },
    { timeout: 10000 },
  ).catch(() => {});
  await page.locator('.login-card .el-select__wrapper').first().click();
  await page.waitForSelector('.el-select-dropdown__item', { timeout: 10000 });
  await page.locator('.el-select-dropdown__item').filter({ hasText: account }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '登录' }).click();
  // 等落地（URL 离开 /login）
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

/** 登出（走侧栏底部返回入口切换） */
async function logout(page) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  // 清登录态：直接回到入口页后再点侧栏不存在，改用 storage 无持久化的特性 → 刷���即重置
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
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

  /** 各角色经 api 层实测的可见条数（隔离断言用，逐角色登录时采集） */
  const isoProbe = { platform: null, cookware: null, iot: null, customer: null };

  try {
    /* ---------- ① 入口页 + 三个入口登录 ---------- */
    console.log('\n── ① 三入口登录 ──');
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    check('入口页渲染出三张入口卡片', (await page.locator('.entry-card').count()) === 3);
    await shot(page, '01-entry');

    // 平台方
    await login(page, 'platform', '平台超级管理员');
    check('平台方登录成功 → 落地 /platform/dashboard', page.url().includes('/platform/dashboard'), page.url());
    check('平台方顶栏数据范围徽标 = 全局（财务字段脱敏）',
      (await readScopeBadge(page)).includes('全局'), await readScopeBadge(page));
    const platformMenu = await readMenuCount(page);
    check('平台方侧栏 14 项', platformMenu === 14, `实际 ${platformMenu}`);
    await shot(page, '02-platform-dashboard');
    // 登录态内采集 api 层实测条数（登出后取到的是空范围，不能这时候取）
    isoProbe.platform = await probeApiCounts(page);
    fact('isolation.platform', isoProbe.platform);

    // 平台总览 KPI / 图表 / 待办
    const kpiCount = await page.locator('.hi-stat-card').count();
    const chartCount = await page.locator('.hi-chart-card').count();
    check('平台总览 6 张 KPI 卡', kpiCount === 6, `实际 ${kpiCount}`);
    check('平台总览 4 张图表卡', chartCount === 4, `实际 ${chartCount}`);
    check('平台总览待办列表 6 项', (await page.locator('.todo-item').count()) === 6);

    // 平台方设备台账条数（全局 86）
    await page.goto(`${BASE}/#/platform/devices`, { waitUntil: 'networkidle' });
    await waitTable(page);
    const platformDeviceTotal = await readTotal(page);
    check('平台方设备台账可见 86 条（全局范围）', platformDeviceTotal === 86, `实际 ${platformDeviceTotal}`);
    await shot(page, '03-platform-devices');

    // 平台方工单管理：只有标记争议 + 导出
    await page.goto(`${BASE}/#/platform/work-orders`, { waitUntil: 'networkidle' });
    await waitTable(page);
    // 记下平台全量条数，作为后面「厂家 < 平台」的动态基线（不写死魔数）
    // 用稳定轮询：单次 readTotal 可能读到初始 0，拿 0 当基线会让下游断言失真
    const platformOrderTotal = await waitTotalStable(page);
    fact('platform.workOrders.total', platformOrderTotal);
    check('平台方工单页无「接单」按钮（PRD Q6）', !(await hasExactButton(page, '接单')));
    check('平台方工单页有「标记争议」', await waitText(page, '标记争议'));
    await shot(page, '04-platform-workorders');

    // 入驻审核列表 + 详情（链路 1）
    await page.goto(`${BASE}/#/platform/review/applications`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const appTotal = await readTotal(page);
    check('入驻申请列表 9 条', appTotal === 9, `实际 ${appTotal}`);
    await shot(page, '05-platform-applications');

    await page.goto(`${BASE}/#/platform/review/applications/ONB-2026-0001`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.status-card__actions button', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    const appBadge = await page.locator('.hi-badge').first().innerText().catch(() => '');
    check('ONB-2026-0001 状态为「待初审」（故事线）', appBadge.includes('待初审'), appBadge);
    const appButtons = await page.locator('.status-card__actions button').allInnerTexts();
    check('审核页有「通过初审」按钮', appButtons.some((t) => t.includes('通过初审')));
    // ⚠️ 按 A9.4 状态机：PENDING_PRIMARY 的整改入口是「退回补充」；「标记整改」在 PENDING_SECONDARY
    check('审核页有「退回补充」按钮（PENDING_PRIMARY 的整改入口）', appButtons.some((t) => t.includes('退回补充')));
    await shot(page, '06-platform-application-detail');

    // 必填原因校验：退回补充不填原因无法提交
    await page.getByRole('button', { name: '退回补充' }).click();
    await page.waitForTimeout(600);
    const confirmDisabled = await page.locator('.el-dialog__footer button').last().isDisabled();
    check('「标记整改」不填原因时确定按钮 disabled', confirmDisabled);
    await shot(page, '07-confirm-require-reason');
    await page.locator('.el-dialog__footer button').first().click(); // 取消
    await page.waitForTimeout(400);

    // ONB-2026-0008 处于 PENDING_SECONDARY，「标记整改」在此状态合法（A9.4）
    await page.goto(`${BASE}/#/platform/review/applications/ONB-2026-0008`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.status-card__actions button', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    const btns8 = await page.locator('.status-card__actions button').allInnerTexts();
    check('待复审页有「标记整改」且无「退回补充」（PENDING_SECONDARY 整改入口正确）',
      btns8.some((t) => t.includes('标记整改')) && !btns8.some((t) => t.includes('退回补充')),
      btns8.join(' / '));
    await page.getByRole('button', { name: '标记整改' }).click();
    await page.waitForTimeout(600);
    const dis8 = await page.locator('.el-dialog__footer button').last().isDisabled();
    check('「标记整改」不填原因时确定按钮 disabled', dis8);
    await shot(page, '07b-mark-rectify-require-reason');
    await page.locator('.el-dialog__footer button').first().click();
    await page.waitForTimeout(300);

    await logout(page);

    /* ---------- ② 厂家端 + 链路 2 / 3 ---------- */
    console.log('\n── ② 厂家端 + 工单闭环 ──');
    await login(page, 'vendor', '厨具厂家·福州华厨设备');
    check('厨具厂家登录成功 → 落地 /vendor/dashboard', page.url().includes('/vendor/dashboard'), page.url());
    check('厂家顶栏数据范围徽标 = 本厂家全部设备',
      (await readScopeBadge(page)).includes('本厂家'), await readScopeBadge(page));
    const vendorMenu = await readMenuCount(page);
    check('厨具厂家侧栏 12 项（隐藏部件台账）', vendorMenu === 12, `实际 ${vendorMenu}`);
    await shot(page, '08-vendor-dashboard');
    isoProbe.cookware = await probeApiCounts(page);
    fact('isolation.cookware', isoProbe.cookware);

    // 厂家设备列表条数（应 < 86）→ 数据隔离生效
    await page.goto(`${BASE}/#/vendor/devices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    const vendorDeviceTotal = await readTotal(page);
    check(`厂家设备列表 < 86 条（实际 ${vendorDeviceTotal}）`, vendorDeviceTotal > 0 && vendorDeviceTotal < 86);
    const firstSn = await page.locator('.el-table__body-wrapper tbody tr').first().innerText();
    check('厂家设备列表有数据', firstSn.length > 0, firstSn.split('\n')[0]);
    await shot(page, '09-vendor-devices');

    // 物联网厂家侧栏差异
    await logout(page);
    await login(page, 'vendor', '物联网厂家·厦门智联感知');
    const iotMenu = await readMenuCount(page);
    check('物联网厂家侧栏 12 项（隐藏产品型号档案）', iotMenu === 12, `实际 ${iotMenu}`);
    const iotBadge = await readScopeBadge(page);
    check('物联网厂家徽标含「部件可见」', iotBadge.includes('部件可见'), iotBadge);
    await shot(page, '10-vendor-iot-dashboard');
    isoProbe.iot = await probeApiCounts(page);
    fact('isolation.iot', isoProbe.iot);

    // 未入驻厂家 → 落地入驻申请 + 侧栏 2 项
    await logout(page);
    await login(page, 'vendor', '物联网厂家·泉州蓝芯物联');
    check('未入驻厂家落地 /vendor/onboarding', page.url().includes('/vendor/onboarding'), page.url());
    const unboundMenu = await readMenuCount(page);
    check('未入驻厂家侧栏仅 2 项', unboundMenu === 2, `实际 ${unboundMenu}`);
    await shot(page, '11-vendor-unbound-onboarding');

    // 回到厨具厂家，走工单闭环
    await logout(page);
    await login(page, 'vendor', '厨具厂家·福州华厨设备');

    await page.goto(`${BASE}/#/vendor/work-orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    const vendorOrderTotal = await readTotal(page);
    // ⚠️ 基线取前面实测的平台全量，不再写死 64：数据量一扩，硬编码基线会失真
    check(`厂家工单列表 < 平台全量 ${platformOrderTotal} 条（实际 ${vendorOrderTotal}）`,
      vendorOrderTotal > 0 && vendorOrderTotal < platformOrderTotal,
      `厂家 ${vendorOrderTotal} < 平台 ${platformOrderTotal}`);
    await shot(page, '12-vendor-workorders');

    // 工单详情 WO-2026-0031（故事线：告警转单 + 待接单 + 紧急）
    await page.goto(`${BASE}/#/vendor/work-orders/WO-2026-0031`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.order-actions button, .sla-countdown', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const badgeBefore = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    check('WO-2026-0031 初始状态「待接单」（故事线）', badgeBefore.includes('待接单'), badgeBefore);
    const slaText = await page.locator('.sla-countdown__text').innerText().catch(() => '');
    check('SLA 倒计时正常显示', /还剩|已超时/.test(slaText), slaText);
    const actionBtns = await page.locator('.order-actions button').allInnerTexts();
    check('待接单时有「接单」按钮', actionBtns.some((t) => t.includes('接单')));
    check('待接单时没有「更新进展」', !actionBtns.some((t) => t.includes('更新进展')));
    await shot(page, '13-vendor-order-pending');

    // 记录时间轴基线：进展必须是「增量落库」，不能靠历史节点蒙混过关
    const timelineBaseline = await page.locator('.el-timeline-item').count();
    fact('order.timeline.baseline', timelineBaseline);

    // 接单：不填说明无法提交
    await page.getByRole('button', { name: '接单' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: '确认接单' }).click();
    await page.waitForTimeout(600);
    const stillOpen = await page.locator('.el-dialog').isVisible();
    check('接单说明为空时不提交（弹窗仍打开）', stillOpen);
    await shot(page, '14-vendor-accept-validate');

    // 填写并提交
    await page.locator('.el-dialog textarea').first().fill('已电话联系客户，约定今日 14:00 上门处理');
    const etaInput = page.locator('.el-dialog .el-date-editor input').first();
    await etaInput.click();
    await page.waitForTimeout(200);
    await etaInput.fill('2026-10-14 14:00:00');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    // 若组件回填失败，兜底走「清空再由组件默认」路径
    const etaVal = await etaInput.inputValue();
    if (!etaVal) {
      await etaInput.click();
      await page.keyboard.type('2026-10-14 14:00:00', { delay: 30 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
    }
    await page.locator('.el-dialog__footer button').last().click();
    await page.waitForTimeout(1600);
    const badgeAfterAccept = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    check('接单后状态变「处理中」', badgeAfterAccept.includes('处理中'), badgeAfterAccept);
    const btnsAfterAccept = await page.locator('.order-actions button').allInnerTexts();
    check('处理中时按钮组变 [更新进展][反馈处理结果]',
      btnsAfterAccept.some((t) => t.includes('更新进展')) && btnsAfterAccept.some((t) => t.includes('反馈')),
      btnsAfterAccept.join(' / '));
    await shot(page, '15-vendor-order-inprogress');

    // 更新进展 ×3
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: '更新进展' }).first().click();
      await page.waitForTimeout(500);
      await page.locator('.el-dialog textarea').first().fill(`进展记录 ${i + 1}：工程师已到场，正在处理`);
      await page.locator('.el-dialog__footer button').last().click();
      await page.waitForTimeout(900);
    }
    const progressCount = await page.locator('.el-timeline-item').count();
    // 增量断言：3 次进展必须严格 +3，而不是「本来就有 3 个历史节点」也能过
    check('3 次更新进展后时间轴节点严格 +3（累积而非覆盖）',
      progressCount === timelineBaseline + 3,
      `before=${timelineBaseline} after=${progressCount} delta=${progressCount - timelineBaseline}`);
    await shot(page, '16-vendor-order-progress');

    // 反馈：不填处理过程说明无法提交
    await page.getByRole('button', { name: '反馈处理结果' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: '提交并转待验收' }).click();
    await page.waitForTimeout(600);
    const feedbackOpen = await page.locator('.el-dialog').isVisible();
    check('处理过程说明为空时不提交（弹窗仍打开）', feedbackOpen);
    await shot(page, '17-vendor-feedback-validate');

    // 填写 + 登记备件 + 提交
    await page.locator('.el-dialog textarea').first().fill('已更换压缩机与温控器，设备恢复正常运行，现场观察 30 分钟无异常');
    await page.locator('.spare-table__editor input').first().fill('压缩机');
    await page.locator('.spare-table__editor input').nth(1).fill('BZ-315');
    await page.getByRole('button', { name: '+ 添加备件' }).click();
    await page.waitForTimeout(400);
    await page.locator('.el-dialog__footer button').last().click();
    await page.waitForTimeout(1600);
    const badgeAfterFeedback = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
    check('反馈后状态变「待验收」', badgeAfterFeedback.includes('待验收'), badgeAfterFeedback);
    const spareRows = await page.locator('.spare-table .el-table__row').count();
    check('备件记录已落库', spareRows >= 1, `备件 ${spareRows} 行`);
    await shot(page, '18-vendor-order-pending-confirm');

    await logout(page);

    /* ---------- ③ 数据隔离对照 ---------- */
    console.log('\n── ③ 数据隔离可见线 ──');

    // 客户账号：先登录取 api 层实测条数（登出后就取不到了），再看设备列表
    await login(page, 'customer', '福州第一中学食堂');
    check('客户登录成功 → 落地 /customer/dashboard', page.url().includes('/customer/dashboard'), page.url());
    check('客户顶栏数据范围徽标 = 本租户全部数据',
      (await readScopeBadge(page)).includes('本租户'), await readScopeBadge(page));
    isoProbe.customer = await probeApiCounts(page);
    fact('isolation.customer', isoProbe.customer);
    await shot(page, '20-customer-dashboard');

    // 客户设备列表（聚合形态，无固件/成本列）
    await page.goto(`${BASE}/#/customer/devices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    await shot(page, '21-customer-devices');

    await logout(page);

    // 隔离强度不读页面静态文案（那只能证明「页面上有这几个字」）。
    // 下面用的是各角色登录时经 api 层实测的真实可见条数（见 probeApiCounts）。
    await page.goto(`${BASE}/#/demo/isolation`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    await shot(page, '19-demo-isolation');

    // 演示页反写死校验：页面表格数字必须与 isolation api 的实时矩阵逐格一致。
    // （若页面改回硬编码文案，这里立刻失败；替代原来 isoRows >= 4 的弱冒烟）
    const isoTable = page.locator('.iso-table').first();
    const isoRowCount = await isoTable.locator('.el-table__row').count();
    check('隔离演示页矩阵表渲染 4 个角色', isoRowCount === 4, `${isoRowCount} 行`);
    const isoMatrixApi = await page.evaluate(async () => {
      // @ts-ignore
      const { getIsolationMatrix } = await import('/src/api/isolation.ts');
      return getIsolationMatrix();
    });
    fact('isolation.matrix', isoMatrixApi);
    const isoPageRows = await isoTable.locator('.el-table__row').evaluateAll((rows) =>
      rows.map((r) => {
        const cells = Array.from(r.querySelectorAll('td')).map((td) => (td.textContent || '').trim());
        return { role: cells[0], devices: Number(cells[3]), orders: Number(cells[4]) };
      }),
    );
    const isoMatrixMatch = isoMatrixApi.every((m) => {
      const p = isoPageRows.find((r) => r.role === m.roleLabel);
      return !!p && p.devices === m.devices && p.orders === m.orders;
    });
    check('演示页表格与 isolation api 实时矩阵逐格一致（未写死）', isoMatrixMatch,
      JSON.stringify(isoPageRows.map((r) => [r.role, r.devices, r.orders])));

    fact('isolation.probe', isoProbe);
    const num = (v) => (typeof v === 'number' ? v : -1);
    const cnt = (role, field) => num(isoProbe[role]?.[field]);
    check('平台方可见设备数 > 厨具厂家 > 客户（严格递减）',
      cnt('platform', 'devices') > cnt('cookware', 'devices')
      && cnt('cookware', 'devices') > cnt('customer', 'devices'),
      `平台 ${cnt('platform', 'devices')} > 厨具 ${cnt('cookware', 'devices')} > 客户 ${cnt('customer', 'devices')}`);
    check('平台方可见工单数 > 厨具厂家 > 客户（严格递减）',
      cnt('platform', 'orders') > cnt('cookware', 'orders')
      && cnt('cookware', 'orders') > cnt('customer', 'orders'),
      `平台 ${cnt('platform', 'orders')} > 厨具 ${cnt('cookware', 'orders')} > 客户 ${cnt('customer', 'orders')}`);
    check('物联网厂家可见设备数与厨具厂家不同（按绑定/型号分流）',
      cnt('iot', 'devices') !== cnt('cookware', 'devices'),
      `物联网 ${cnt('iot', 'devices')} vs 厨具 ${cnt('cookware', 'devices')}`);
    check('客户可见设备数落在 F3 预期区间 [8,15]',
      cnt('customer', 'devices') >= 8 && cnt('customer', 'devices') <= 15,
      `实测 ${cnt('customer', 'devices')} 台`);
    check('客户可见工单数落在 F3 预期区间 [3,5]',
      cnt('customer', 'orders') >= 3 && cnt('customer', 'orders') <= 5,
      `实测 ${cnt('customer', 'orders')} 张`);
    // 三角闭合：isolation api 矩阵（scope 工厂实时算）必须与各角色登录态 api 实测逐一相等
    const byRole = (label) => isoMatrixApi.find((m) => m.roleLabel === label);
    const mP = byRole('平台方');
    const mCk = byRole('厨具厂家');
    const mIot = byRole('物联网厂家');
    const mCu = byRole('客户');
    check('isolation api 矩阵与四角色登录态实测完全一致',
      !!mP && !!mCk && !!mIot && !!mCu
      && mP.devices === cnt('platform', 'devices') && mP.orders === cnt('platform', 'orders')
      && mCk.devices === cnt('cookware', 'devices') && mCk.orders === cnt('cookware', 'orders')
      && mIot.devices === cnt('iot', 'devices') && mIot.orders === cnt('iot', 'orders')
      && mCu.devices === cnt('customer', 'devices') && mCu.orders === cnt('customer', 'orders'),
      `矩阵 ${mP.devices}/${mCk.devices}/${mIot.devices}/${mCu.devices} 台 vs 实测 ${cnt('platform', 'devices')}/${cnt('cookware', 'devices')}/${cnt('iot', 'devices')}/${cnt('customer', 'devices')} 台`);

    await logout(page);

    /* ---------- ④ 未登录守卫 ---------- */
    console.log('\n── ④ 路由守卫 ──');
    await page.goto(`${BASE}/#/vendor/devices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    check('未登录访问 /vendor/devices 被重定向到登录页并带 role+redirect',
      page.url().includes('/login') && page.url().includes('role=vendor'),
      page.url());

    // 角色不匹配 → 403
    await login(page, 'customer', '福州第一中学食堂');
    await page.goto(`${BASE}/#/platform/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    check('客户访问平台页被拦到 403', page.url().includes('/403'), page.url());
    await shot(page, '22-forbidden-403');

    await logout(page);
    // 厂家类型不匹配
    await login(page, 'vendor', '厨具厂家·福州华厨设备');
    await page.goto(`${BASE}/#/vendor/components`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    check('厨具厂家访问 /vendor/components 被弹回 dashboard', page.url().includes('/vendor/dashboard'), page.url());
    await shot(page, '23-vendor-type-guard');

    await logout(page);

    /* ---------- ⑤ 演示导览 ---------- */
    await page.goto(`${BASE}/#/demo/guide`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const flowCards = await page.locator('.flow-card').count();
    check('演示导览 4 条主链路卡片', flowCards === 4, `实际 ${flowCards}`);
    await shot(page, '24-demo-guide');

    /* ---------- ⑥ 控制台错误 ---------- */
    console.log('\n── ⑤ 控制台错误 ──');
    // 过滤掉与业务无关的资源加载噪音（如地图 GeoJSON 动态 import 的开发期提示）
    const realErrors = errors.filter((e) => !/favicon|ERR_FILE_NOT_FOUND/i.test(e));
    check('控制台零报错', realErrors.length === 0, realErrors.length ? realErrors.slice(0, 5).join(' | ') : '无');

    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '25-entry-final');
  } catch (e) {
    check('脚本执行异常', false, String(e));
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n══════════════════════════════════');
  console.log(`通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
  console.log(`截图目录：${OUT}`);
  if (failed.length) {
    console.log('\n失败明细：');
    failed.forEach((f) => console.log(`  ❌ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    process.exitCode = 1;
  }
})();