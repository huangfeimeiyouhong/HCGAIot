const { chromium } = require('/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core');
const path = require('path');

const FILE = '后厨管家-AIoT平台运营全景监控大屏.html';
const URL = 'file://' + path.resolve(__dirname, FILE);

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1) 无溢出
  const overflow = await page.evaluate(() => {
    const s = document.documentElement;
    return { sw: s.scrollWidth, sh: s.scrollHeight, cw: s.clientWidth, ch: s.clientHeight };
  });

  // 2) 每个图表容器内的 canvas 是否真实渲染（按容器校验，规避 ECharts 辅助 canvas）
  const chartIds = ['chartDonut','chartWoStatus','chartLoad','chartWoTrend','chartOnline','chartSla','chartMap','chartSrc'];
  const chartRender = await page.evaluate((ids) => ids.map(id => {
    const box = document.getElementById(id);
    const cv = box ? box.querySelector('canvas') : null;
    return { id, ok: !!(cv && cv.width > 0 && cv.height > 0),
      w: cv ? cv.width : 0, h: cv ? cv.height : 0 };
  }), chartIds);
  const canvases = await page.evaluate(() =>
    Array.from(document.querySelectorAll('canvas')).map(c => ({ w: c.width, h: c.height }))
  );

  // 3) 关键 DOM 内容
  const content = await page.evaluate(() => {
    const txt = id => (document.getElementById(id) || {}).textContent || '';
    return {
      stripItems: document.querySelectorAll('#strip .strip__item').length,
      stripLabel: (document.querySelector('#strip .strip__label b') || {}).textContent || '',
      kpiChips: document.querySelectorAll('#kpiRow .kpi-chip').length,
      subChips: document.querySelectorAll('#subRow .sub-chip').length,
      donutTotal: txt('donutTotal'),
      levelCards: document.querySelectorAll('#levelRow .level-card').length,
      srcLegend: document.querySelectorAll('#srcLegend .src-legend__item').length,
      alarmRows: document.querySelectorAll('#tickerTrack .alarm').length,
      kpiScore: document.querySelectorAll('#kpiScore .score').length,
      todos: document.querySelectorAll('#todoList .todo__item').length,
      woFoot: document.querySelectorAll('#woFoot .wo-foot__chip').length,
      mapTitle: txt('mapTitle'),
      title: (document.querySelector('.hd__title') || {}).textContent || ''
    };
  });

  // 4) 下钻：点击福建省
  let drill = {};
  try {
    await page.evaluate(() => { window.__iot.drill(); });
    await page.waitForTimeout(800);
    drill = await page.evaluate(() => ({
      mapMode: window.__iot.mapMode,
      title: (document.getElementById('mapTitle') || {}).textContent,
      cityRows: document.querySelectorAll('#cityList .city-row').length,
      btnBackVisible: !document.getElementById('btnBack').classList.contains('hidden')
    }));
    await page.evaluate(() => { window.__iot.back(); });
    await page.waitForTimeout(400);
  } catch (e) { drill = { error: e.message }; }

  await page.screenshot({ path: path.resolve(__dirname, '_shot-platform.png') });

  await browser.close();

  const rendered = canvases.filter(c => c.w > 0 && c.h > 0).length;
  console.log('=== 平台运营大屏验收 ===');
  console.log('无溢出:', JSON.stringify(overflow),
    overflow.sw === 1920 && overflow.sh === 1080 ? 'PASS' : 'FAIL');
  console.log('canvas 总数/已渲染:', canvases.length, '/', rendered);
  chartRender.forEach(c => console.log('  图表', c.id, c.ok ? 'PASS' : 'FAIL', c.w + 'x' + c.h));
  const chartsOk = chartRender.every(c => c.ok);
  console.log('8 个图表全部渲染:', chartsOk ? 'PASS' : 'FAIL');
  console.log('状态条项:', content.stripItems, '| 标签:', content.stripLabel);
  console.log('KPI卡:', content.kpiChips, '| 副指标:', content.subChips, '| 环形中心:', content.donutTotal);
  console.log('告警等级卡:', content.levelCards, '| 来源图例:', content.srcLegend, '| 实时告警行:', content.alarmRows);
  console.log('KPI绩效:', content.kpiScore, '| 待办:', content.todos, '| 工单脚注:', content.woFoot);
  console.log('地图标题:', content.mapTitle, '| 大屏标题:', content.title);
  console.log('下钻:', JSON.stringify(drill),
    (drill.mapMode === 'fujian' && drill.cityRows >= 9) ? 'PASS' : 'FAIL');
  console.log('console/pageerror:', errors.length === 0 ? 'PASS (0)' : 'FAIL', errors);
})().catch(e => { console.error('VERIFY CRASH:', e); process.exit(1); });
