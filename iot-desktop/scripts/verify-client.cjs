/**
 * 客户端 13 页 + 两条断链主链路 端到端验收（无头 Chrome）
 *
 * 覆盖范围：
 *   ① 客户端 13 个路由全部脱离占位（PRD P0-11 ~ P0-16）
 *   ② 数据隔离：客户侧设备数 / 工单数落在 F3 预期区间，越权访问他人设备抛错
 *   ③ 断链二（绑定确认）：厂家申报 → 客户确认 → 设备进入资产视图；
 *      客户拒绝（必填原因）→ 绑定不生效、设备不进资产视图
 *   ④ 断链一（工单闭环）：客户发起 → 厂家接单 → 反馈结果 → 待验收 →
 *      客户验收通过 → 已完成；客户验收驳回（必填原因）→ 退回处理中
 *   ⑤ 控制台零报错
 *
 * 运行：node scripts/verify-client.cjs
 * 环境：BASE_URL（默认 http://localhost:9900）
 * 截图：screenshots/qa-client/
 */
const path = require('node:path');
const fs = require('node:fs');

const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:9900';
const OUT = path.resolve(__dirname, '../screenshots/qa-client');

/** 断言累计 */
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

/** 记录实测事实（不算断言，只留证据） */
function fact(key, value) {
  console.log(`  FACT | ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
}

/** 读顶栏数据范围徽标 */
const readScopeBadge = (page) =>
  page.locator('.hi-scope-badge__text').first().innerText().catch(() => '');

/** 读表格行数 */
const readRowCount = (page) =>
  page.locator('.el-table__body-wrapper tbody tr.el-table__row').count();

/** 读分页总条数；读不到返回 -1（区分「读失败」与「0 条」） */
const readTotal = async (page) => {
  const t = await page.locator('.hi-pagination').first().innerText().catch(() => '');
  const m = String(t).match(/共\s*([\d,]+)\s*条/);
  return m ? Number(m[1].replace(/,/g, '')) : -1;
};

/** 等表格渲染完成（v-loading 遮罩消失） */
async function waitTable(page, timeout = 15000) {
  await page.waitForSelector('.el-table__body-wrapper tbody tr.el-table__row', { timeout }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.el-loading-mask'), { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
}

/** 轮询等待页面出现某段文本 */
async function waitText(page, text, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const t = await page.locator('.hi-page').first().innerText().catch(() => '');
    if (t.includes(text)) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

/** 页面主体文本 */
const bodyText = (page) => page.locator('.hi-page').first().innerText().catch(() => '');

/**
 * 占位页判定（与 qa-verify.cjs 保持同一套措辞，避免两边标准漂移）
 *
 * ⚠️ 两个方向都不能瞎：
 *   ① 误判（假阳性）：不能用宽泛的「占位」二字——发起报修页有合规提示
 *      「仅演示占位，不会上传真实文件」，会把正常页误判成占位页；
 *   ② 漏判（假阴性）：必须收录本工程第一版占位页的原生措辞
 *      「占位实现」「第二批交付」，否则页面回退成占位页时守卫会报「已实现」。
 */
const PAGE_PLACEHOLDER_RE =
  /占位实现|占位页|页面占位|第二批交付|第二批实现|第二批开发|待开发|敬请期待|功能建设中|页面建设中/;
const NOT_PLACEHOLDER_HINTS = /仅演示占位|演示占位|占位符|上传占位|占位文本|placeholder/i;

/** 是否占位页：命中占位措辞，且不属于上传类合规提示 */
function isPlaceholderPage(text) {
  const t = String(text || '');
  return PAGE_PLACEHOLDER_RE.test(t) && !NOT_PLACEHOLDER_HINTS.test(t);
}

/**
 * 在二次确认弹窗（ConfirmDialog）里点「确定」
 * @param page 页面
 * @param reason 必填原因（对话框 requireReason 时必填，否则确定按钮禁用）
 */
async function confirmInDialog(page, reason) {
  const dlg = page.locator('.hi-confirm').last();
  await dlg.waitFor({ state: 'visible', timeout: 10000 });
  if (reason) {
    await dlg.locator('.hi-confirm__reason textarea').fill(reason);
    await page.waitForTimeout(200);
  }
  await dlg.getByRole('button', { name: '确定' }).click();
  await page.waitForTimeout(600);
}

/**
 * 在表单弹窗（FormDialog，厂家接单 / 反馈结果用）里填字段并点确认
 * @param page 页面
 * @param confirmText 确认按钮文案（如「确认接单」/「提交并转待验收」）
 * @param fills 需填写的文本域 [{ label, value }]，按 el-form-item 标签定位
 */
async function submitFormDialog(page, confirmText, fills = []) {
  const dlg = page.locator('.hi-form-dialog').last();
  await dlg.waitFor({ state: 'visible', timeout: 10000 });
  for (const f of fills) {
    const item = dlg.locator('.el-form-item').filter({ hasText: f.label }).first();
    await item.locator('textarea').fill(f.value);
  }
  await page.waitForTimeout(200);
  await dlg.getByRole('button', { name: confirmText }).click();
  await page.waitForTimeout(1500);
}

/** 读工单详情页的状态徽标（位于页头 extra 插槽） */
const readOrderStatus = async (page) => {
  const t = await page.locator('.hi-page__extra .hi-badge').first().innerText().catch(() => '');
  return t.trim();
};

/** 登录：填演示账号 → 点登录 → 等落地 */
async function login(page, role, account) {
  // ⚠️ 先跳入口页再进登录页：仅 hash 变化时 vue-router 复用组件实例，onMounted 不重跑
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.goto(`${BASE}/#/login?role=${role}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
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
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

/**
 * 登出（走侧栏「返回入口切换」）
 *
 * ⚠️ 刻意不走 page.reload()：mock 库是「刷新即复位」的内存单例，
 *   一旦整页刷新，厂家侧刚做的状态流转就丢了，跨入口全链路无法连续验证。
 *   UI 登出只调 auth.logout() + router.push('/')，不触发整页刷新，
 *   内存库在同一 SPA 会话内延续 —— 这样才能把
 *   「客户发起 → 厂家接单 → 处理 → 待验收 → 客户验收通过 → 已完成」一整条走完。
 */
async function logout(page) {
  await page.locator('.hi-sidenav__back').click();
  await page.waitForFunction(() => location.hash === '#/' || location.hash === '', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/** 强制整页刷新（用于验证「刷新即复位」的演示约束，或重置数据） */
async function hardReset(page) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

/** 打开指定路由并等页面就绪 */
async function goto(page, hash) {
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
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
  const toasts = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e)}`));

  /** 抓取 Element Plus 消息提示（成功 / 失败都要看到） */
  const drainToasts = async () => {
    const found = await page.locator('.el-message').allInnerTexts().catch(() => []);
    found.forEach((t) => toasts.push(t.replace(/\s+/g, ' ').trim()));
    return found;
  };

  try {
    /* ============================================================
     * ① 登录 + 客户工作台非占位
     * ============================================================ */
    console.log('\n── ① 客户登录与工作台 ──');
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    check('客户登录成功 → 落地 /customer/dashboard', page.url().includes('/customer/dashboard'), page.url().replace(BASE, ''));
    fact('customer.scopeBadge', await readScopeBadge(page));

    const dashText = await bodyText(page);
    check('客户工作台非占位', !isPlaceholderPage(dashText), `正文 ${dashText.length} 字`);
    check('客户工作台渲染出 KPI 卡', (await page.locator('.hi-stat-card').count()) > 0, `实际 ${await page.locator('.hi-stat-card').count()} 张`);
    await shot(page, '01-customer-dashboard');

    /* ============================================================
     * ② 客户端 13 页全部脱离占位
     * ============================================================ */
    console.log('\n── ② 客户端 13 页脱离占位 ──');

    // 先从设备列表拿一台真实设备 SN，供设备详情页使用
    await goto(page, '/customer/devices');
    await waitTable(page);
    const custDeviceTotal = await readTotal(page);
    fact('customer.devices.total', custDeviceTotal);
    const firstDeviceSn = await page
      .locator('.el-table__body-wrapper tbody tr.el-table__row td:first-child')
      .first()
      .innerText()
      .catch(() => '');
    fact('customer.devices.firstSn', firstDeviceSn.trim());

    // 从告警列表拿一条真实告警 id
    await goto(page, '/customer/alarms');
    await waitTable(page);
    const custAlarmTotal = await readTotal(page);
    fact('customer.alarms.total', custAlarmTotal);
    const firstAlarmId = await page
      .locator('.el-table__body-wrapper tbody tr.el-table__row td:first-child')
      .first()
      .innerText()
      .catch(() => '');
    fact('customer.alarms.firstId', firstAlarmId.trim());

    // 从工单列表拿一张真实工单号
    await goto(page, '/customer/work-orders');
    await waitTable(page);
    const custOrderTotal = await readTotal(page);
    fact('customer.workOrders.total', custOrderTotal);
    const firstOrderCode = await page
      .locator('.el-table__body-wrapper tbody tr.el-table__row td:first-child')
      .first()
      .innerText()
      .catch(() => '');
    fact('customer.workOrders.firstCode', firstOrderCode.trim());

    // 13 个路由逐一验证：非占位 + 有实质内容
    const routes = [
      { hash: '/customer/dashboard', name: '工作台' },
      { hash: '/customer/devices', name: '我的设备' },
      { hash: `/customer/devices/${encodeURIComponent(firstDeviceSn.trim())}`, name: '设备详情' },
      { hash: '/customer/alarms', name: '告警中心' },
      { hash: `/customer/alarms/${encodeURIComponent(firstAlarmId.trim())}`, name: '告警详情' },
      { hash: '/customer/work-orders', name: '报修工单' },
      { hash: '/customer/work-orders/create', name: '发起报修' },
      { hash: `/customer/work-orders/${encodeURIComponent(firstOrderCode.trim())}`, name: '工单详情' },
      { hash: '/customer/bindings', name: '绑定确认' },
      { hash: '/customer/vendors', name: '我的厂家' },
      { hash: '/customer/thresholds', name: '阈值设置' },
      { hash: '/customer/accounts', name: '账号管理' },
      { hash: '/customer/notifications', name: '消息通知' },
    ];

    let placeholderPages = [];
    let thinPages = [];
    for (const r of routes) {
      await goto(page, r.hash);
      await page.waitForTimeout(500);
      const text = await bodyText(page);
      const isPlaceholder = isPlaceholderPage(text);
      // 「有实质内容」：正文字数 ≥ 30，或渲染出了表格行 / 表单控件 / 空状态组件
      const hasStructure =
        (await page.locator('.el-table__body-wrapper tbody tr').count()) > 0 ||
        (await page.locator('.el-form').count()) > 0 ||
        (await page.locator('.el-empty, .hi-empty').count()) > 0 ||
        (await page.locator('.hi-stat-card').count()) > 0 ||
        (await page.locator('.el-timeline').count()) > 0;
      const ok = !isPlaceholder && (text.length >= 30 || hasStructure);
      if (!ok) {
        if (isPlaceholder) placeholderPages.push(r.name);
        else thinPages.push(`${r.name}(${text.length}字)`);
      }
      check(`客户端「${r.name}」非占位且有实质内容`, ok, `${text.length} 字${hasStructure ? ' · 有结构' : ''}`);
    }
    fact('client.placeholderPages', placeholderPages);
    fact('client.thinPages', thinPages);

    /* ============================================================
     * ③ 数据隔离
     * ============================================================ */
    console.log('\n── ③ 客户侧数据隔离 ──');
    check('F3：客户可见设备数 ∈ [8,15]', custDeviceTotal >= 8 && custDeviceTotal <= 15, `实际 ${custDeviceTotal} 台`);
    check('F3：客户可见工单数 ∈ [3,5]', custOrderTotal >= 3 && custOrderTotal <= 5, `实际 ${custOrderTotal} 张`);
    check('客户顶栏数据范围徽标 = 本租户全部数据', (await readScopeBadge(page)).includes('本租户'), await readScopeBadge(page));

    // 越权：手输 URL 访问一台不属于本客户的设备详情
    // 取一台「平台方可见但客户不可见」的设备：用客户侧拿不到的平台设备做探测，
    // 这里直接用客户设备列表之外的一台 —— 从越权样本构造（客户列表首台之外的任意 SN）
    await goto(page, '/customer/devices');
    await waitTable(page);
    const allSnCells = await page.locator('.el-table__body-wrapper tbody tr.el-table__row td:first-child').allInnerTexts();
    const visibleSns = new Set(allSnCells.map((s) => s.trim()));
    fact('customer.visibleSns', [...visibleSns]);

    // 构造一个确定不可见的 SN：客户可见集合之外的同型号设备（CK-XA-2026-0001 是无绑定演示设备）
    const FOREIGN_SN = 'CK-XA-2026-0001';
    check('越权样本确实不在客户可见集合内', !visibleSns.has(FOREIGN_SN), FOREIGN_SN);

    const forbiddenBefore = errors.length;
    await goto(page, `/customer/devices/${FOREIGN_SN}`);
    await page.waitForTimeout(2000);
    // 越权会被 api 层拦下：scopedFind 返回 null → 抛错 → 页面提示并回列表页
    const redirectedToList = page.url().includes('/customer/devices') && !page.url().includes(FOREIGN_SN);
    const hasErrorToast = await page
      .locator('.el-message--error')
      .first()
      .innerText()
      .then((t) => t.length > 0)
      .catch(() => false);
    const forbiddenText = await bodyText(page);
    check(
      '越权访问他人设备详情被拒绝（回列表页 + 错误提示）',
      redirectedToList && hasErrorToast,
      `url=${page.url().replace(BASE, '')} toast=${hasErrorToast}`,
    );
    await shot(page, '02-customer-forbidden');
    check('越权访问未产生控制台报错', errors.length === forbiddenBefore, `新增 ${errors.length - forbiddenBefore} 条`);

    /* ============================================================
     * ④ 断链二：绑定确认
     * ============================================================ */
    console.log('\n── ④ 绑定确认（断链二） ──');
    await goto(page, '/customer/bindings');
    await page.waitForTimeout(1000);
    const bindText = await bodyText(page);
    const pendingBindRows = await readRowCount(page);
    fact('customer.pendingBindings.rows', pendingBindRows);

    const hasPendingBinding = pendingBindRows > 0 && !/暂无待确认的绑定/.test(bindText);
    check('客户侧存在待确认绑定（BD-9001）', hasPendingBinding, `表格 ${pendingBindRows} 行`);
    await shot(page, '03-customer-bindings');

    if (hasPendingBinding) {
      // 先测「拒绝（必填原因）」：拒绝后设备不得进入资产视图
      await page.locator('.el-table__body-wrapper tbody tr.el-table__row').first().locator('button', { hasText: '拒绝' }).click();
      await page.waitForTimeout(500);
      const rejDlg = page.locator('.hi-confirm').last();
      await rejDlg.waitFor({ state: 'visible', timeout: 8000 });

      // 必填原因未填时「确定」必须禁用
      const okDisabledBefore = await rejDlg.getByRole('button', { name: '确定' }).isDisabled();
      check('拒绝绑定：原因未填时「确定」禁用', okDisabledBefore);

      await rejDlg.locator('.hi-confirm__reason textarea').fill('厂家信息不符，设备不属于该厂家');
      await page.waitForTimeout(300);
      const okEnabledAfter = await rejDlg.getByRole('button', { name: '确定' }).isEnabled();
      check('拒绝绑定：填写原因后「确定」可用', okEnabledAfter);
      await rejDlg.getByRole('button', { name: '确定' }).click();
      await page.waitForTimeout(1200);
      await shot(page, '04-customer-binding-rejected');

      const afterReject = await bodyText(page);
      check('拒绝后列表不再有待确认绑定', /暂无待确认的绑定/.test(afterReject) || (await readRowCount(page)) === 0);
    }

    // 整页刷新 → 内存库回到初始态（BD-9001 恢复待确认），再测「确认」
    await hardReset(page);
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    await goto(page, '/customer/devices');
    await waitTable(page);
    const devicesBeforeConfirm = await readTotal(page);
    fact('customer.devices.beforeConfirm', devicesBeforeConfirm);

    await goto(page, '/customer/bindings');
    await page.waitForTimeout(1000);
    const pendingBindRows2 = await readRowCount(page);
    /**
     * ⚠️ 这条不是功能断言，是「演示环境局限」的事实记录：
     *    mock 库是模块级内存单例，整页刷新即复位，所以上一步被拒绝的 BD-9001 会「复活」。
     *    真实产品里「拒绝绑定」应当持久化，拒绝后不该再出现。
     *    这里利用该特性把 BD-9001 复位回待确认态，才能继续测「确认」分支；
     *    断言名必须写明是局限，避免后人误当成产品预期。
     */
    check('[演示局限·非产品预期] 整页刷新后内存库复位，BD-9001 回到待确认（真实产品拒绝应持久）',
      pendingBindRows2 > 0, `表格 ${pendingBindRows2} 行`);

    if (pendingBindRows2 > 0) {
      const bindSnCell = await page
        .locator('.el-table__body-wrapper tbody tr.el-table__row td:nth-child(2)')
        .first()
        .innerText()
        .catch(() => '');
      const bindSn = bindSnCell.trim();
      fact('customer.pendingBinding.deviceSn', bindSn);

      await page.locator('.el-table__body-wrapper tbody tr.el-table__row').first().locator('button', { hasText: '确认' }).click();
      await page.waitForTimeout(500);
      await confirmInDialog(page, '');
      await page.waitForTimeout(1200);
      const confirmToasts = await drainToasts();
      fact('customer.confirmBinding.toasts', confirmToasts);
      const bindRowsAfterConfirm = await readRowCount(page);
      fact('customer.bindings.afterConfirm', bindRowsAfterConfirm);
      await shot(page, '05-customer-binding-confirmed');

      // 确认后设备必须出现在资产视图
      await goto(page, '/customer/devices');
      await waitTable(page);
      const devicesAfterConfirm = await readTotal(page);
      fact('customer.devices.afterConfirm', devicesAfterConfirm);
      check('确认绑定后设备总数 +1', devicesAfterConfirm === devicesBeforeConfirm + 1, `${devicesBeforeConfirm} → ${devicesAfterConfirm}`);

      const snCells = await page.locator('.el-table__body-wrapper tbody tr.el-table__row td:first-child').allInnerTexts();
      check(
        `确认绑定后 ${bindSn} 出现在资产视图`,
        snCells.map((s) => s.trim()).includes(bindSn),
        `共 ${snCells.length} 台`,
      );
      await shot(page, '06-customer-devices-after-confirm');
    }

    /* ============================================================
     * ⑤ 断链一：工单闭环（跨入口全链路，同一 SPA 会话内连续走完）
     * ============================================================ */
    console.log('\n── ⑤ 工单闭环（断链一） ──');

    // 5.1 厂家侧：WO-2026-0031 待接单 → 接单 → 反馈处理结果 → 待验收
    await logout(page);
    await login(page, 'vendor', '厨具厂家');
    check('厂家登录成功', page.url().includes('/vendor/'), page.url().replace(BASE, ''));

    await goto(page, '/vendor/work-orders/WO-2026-0031');
    await page.waitForTimeout(1200);
    const vStatus1 = await readOrderStatus(page);
    fact('WO-2026-0031.vendor.initialStatus', vStatus1);
    check('WO-2026-0031 初始为待接单', vStatus1 === '待接单', vStatus1);
    await shot(page, '07-vendor-order-pending-accept');

    if (vStatus1 === '待接单') {
      await page.getByRole('button', { name: '接单' }).click();
      await page.waitForTimeout(600);
      // 接单走 AcceptDialog（FormDialog）：必填接单说明，ETA 已预填
      await submitFormDialog(page, '确认接单', [
        { label: '接单说明', value: '已电话联系客户，约定今日上门检修' },
      ]);
      const vStatus2 = await readOrderStatus(page);
      check('厂家接单后 → 处理中', vStatus2 === '处理中', vStatus2);
      await shot(page, '08-vendor-order-in-progress');

      if (vStatus2 === '处理中') {
        await page.getByRole('button', { name: '反馈处理结果' }).click();
        await page.waitForTimeout(600);
        // 反馈走 FormDialog：必填处理过程说明
        await submitFormDialog(page, '提交并转待验收', [
          { label: '处理过程说明', value: '已更换损坏温控器，设备恢复正常运行' },
        ]);
        const vStatus3 = await readOrderStatus(page);
        check('厂家反馈结果后 → 待验收', vStatus3 === '待验收', vStatus3);
        await shot(page, '09-vendor-order-pending-confirm');
      }
    }

    // 5.2 切到客户账号（不刷新页面，内存库延续）→ 同一张工单应为「待验收」
    await logout(page);
    await login(page, 'customer', '福州第一中学食堂（管理员）');
    await goto(page, '/customer/work-orders/WO-2026-0031');
    await page.waitForTimeout(1500);
    const cStatus1 = await readOrderStatus(page);
    fact('WO-2026-0031.customer.status', cStatus1);
    check('客户看到 WO-2026-0031 已变为待验收（跨入口状态延续）', cStatus1 === '待验收', cStatus1);
    await shot(page, '10-customer-order-pending-confirm');

    if (cStatus1 === '待验收') {
      await page.getByRole('button', { name: '验收通过' }).click();
      await page.waitForTimeout(600);
      await confirmInDialog(page, '');
      await page.waitForTimeout(1800);
      const cStatus2 = await readOrderStatus(page);
      check('客户验收通过后 → 已完成（工单闭环）', cStatus2 === '已完成', cStatus2);
      await shot(page, '11-customer-order-completed');
    }

    // 5.3 客户侧：WO-2026-9011 待验收 → 验收驳回（必填原因）→ 退回处理中
    await goto(page, '/customer/work-orders/WO-2026-9011');
    await page.waitForTimeout(1500);
    const rStatus1 = await readOrderStatus(page);
    fact('WO-2026-9011.status', rStatus1);
    check('WO-2026-9011 为待验收', rStatus1 === '待验收', rStatus1);
    await shot(page, '12-customer-order-9011-pending');

    if (rStatus1 === '待验收') {
      await page.getByRole('button', { name: '验收驳回' }).click();
      await page.waitForTimeout(600);
      const rejDlg = page.locator('.hi-confirm').last();
      await rejDlg.waitFor({ state: 'visible', timeout: 8000 });

      const disabledBefore = await rejDlg.getByRole('button', { name: '确定' }).isDisabled();
      check('验收驳回：原因未填时「确定」禁用', disabledBefore);

      await rejDlg.locator('.hi-confirm__reason textarea').fill('设备仍未制冷，异响未消除');
      await page.waitForTimeout(300);
      const enabledAfter = await rejDlg.getByRole('button', { name: '确定' }).isEnabled();
      check('验收驳回：填写原因后「确定」可用', enabledAfter);
      await rejDlg.getByRole('button', { name: '确定' }).click();
      await page.waitForTimeout(1800);
      const rStatus2 = await readOrderStatus(page);
      check('客户验收驳回后 → 退回处理中', rStatus2 === '处理中', rStatus2);
      await shot(page, '13-customer-order-rejected');
    }

    /* ============================================================
     * ⑥ 控制台零报错
     * ============================================================ */
    console.log('\n── ⑥ 控制台报错 ──');
    // 忽略 favicon 404（无头环境无图标资源，与业务无关）
    const realErrors = errors.filter((e) => !/favicon/i.test(e));
    check('控制台零报错', realErrors.length === 0, realErrors.slice(0, 5).join(' ; ') || '无');
    fact('console.errors.count', realErrors.length);

    /* ============================================================
     * 汇总
     * ============================================================ */
    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    console.log('\n══════════════════════════════════');
    console.log(`通过 ${passed} 项，失败 ${failed} 项`);
    console.log('══════════════════════════════════');
    if (failed > 0) {
      console.log('\n失败明细：');
      results.filter((r) => !r.ok).forEach((r) => console.log(`  ❌ ${r.name} — ${r.detail}`));
    }
    fs.writeFileSync(
      path.join(OUT, 'facts.json'),
      JSON.stringify({ passed, failed, results }, null, 2),
      'utf-8',
    );
  } catch (err) {
    console.error('\n💥 脚本执行异常：', err);
    await shot(page, '99-error').catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
