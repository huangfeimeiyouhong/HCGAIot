/* 独立静态大屏(file://)验收脚本:截图 + 溢出检测 + console 错误 + 下钻交互 */
const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGE =
  '/Users/phil/WorkBuddy/后厨管家AIoT平台/iot-cockpit/standalone/后厨管家-IoT设备全景监控大屏.html';
const OUT_MAIN = '/Users/phil/WorkBuddy/后厨管家AIoT平台/iot-cockpit/standalone/_shot-main.png';
const OUT_DRILL = '/Users/phil/WorkBuddy/后厨管家AIoT平台/iot-cockpit/standalone/_shot-drill.png';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('[console] ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e)));

  await page.goto('file://' + PAGE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3500);

  // 溢出检测:屏幕壳实际渲染尺寸 vs 1920×1080
  const overflow = await page.evaluate(() => {
    const s = document.getElementById('screen');
    const r = s.getBoundingClientRect();
    const body = {
      scrollW: document.body.scrollWidth,
      scrollH: document.body.scrollHeight,
      clientW: document.documentElement.clientWidth,
      clientH: document.documentElement.clientHeight,
    };
    // 关键面板是否都渲染出内容
    const panels = Array.from(document.querySelectorAll('.panel')).map((p) => ({
      title: p.querySelector('.panel__title')?.textContent?.trim(),
      w: Math.round(p.getBoundingClientRect().width),
      h: Math.round(p.getBoundingClientRect().height),
      hasChart: !!p.querySelector('canvas'),
    }));
    return {
      screenW: Math.round(r.width),
      screenH: Math.round(r.height),
      body,
      panels,
      kpi: document.querySelectorAll('.kpi-chip').length,
      env: document.querySelectorAll('.env-card').length,
      alarm: document.querySelectorAll('#tickerTrack .alarm').length,
      donutTotal: document.getElementById('donutTotal')?.textContent,
      rateBadge: document.getElementById('rateBadge')?.textContent,
      crumb: document.getElementById('crumbCur')?.textContent,
    };
  });

  await page.screenshot({ path: OUT_MAIN });

  // 交互:点击福建下钻
  let drill = { ok: false };
  try {
    const pt = await page.evaluate(() => {
      const inst = window.__iot.charts.map;
      // 福建中心附近(屏幕内换算)
      const p = inst.convertToPixel({ geoIndex: 0 }, [117.9, 26.0]);
      const rect = document.getElementById('chartMap').getBoundingClientRect();
      return { x: Math.round(rect.left + p[0]), y: Math.round(rect.top + p[1]) };
    });
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(1200);
    drill = await page.evaluate(() => ({
      ok: window.__iot.mapMode === 'fujian',
      mode: window.__iot.mapMode,
      crumb: document.getElementById('crumbCur').textContent,
      title: document.getElementById('mapTitle').textContent,
      extra: document.getElementById('mapExtra').textContent,
      backVisible: !document.getElementById('btnBack').classList.contains('hidden'),
      cityRows: document.querySelectorAll('.city-row').length,
    }));
    await page.screenshot({ path: OUT_DRILL });
  } catch (e) {
    drill = { error: String(e) };
  }

  console.log('OVERFLOW ' + JSON.stringify(overflow, null, 2));
  console.log('DRILL ' + JSON.stringify(drill, null, 2));
  console.log('ERRORS ' + (errors.length ? JSON.stringify(errors, null, 2) : 'none'));
  await browser.close();
})().catch((e) => {
  console.error('FAIL ' + String(e));
  process.exit(1);
});