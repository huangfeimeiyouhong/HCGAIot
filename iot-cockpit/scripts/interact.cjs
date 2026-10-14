/* 精确点击福建省(经 __geoChart.convertToPixel 换算画布坐标)验证下钻 */
const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:9899/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  const pt = await page.evaluate(() => {
    const chart = window.__geoChart;
    const dom = document.querySelector('.geo-map__chart > div');
    if (!chart || !dom) return null;
    // 福建省中心 [118.16, 25.93]
    const p = chart.convertToPixel({ geoIndex: 0 }, [118.16, 25.93]);
    const rect = dom.getBoundingClientRect();
    return { x: Math.round(rect.left + p[0]), y: Math.round(rect.top + p[1]) };
  });
  console.log('FUJIAN_PIXEL ' + JSON.stringify(pt));
  if (pt) {
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(2500);
  }
  console.log('AFTER_CLICK_URL ' + page.url());
  const ok = page.url().includes('/dashboard/province/35');
  await page.screenshot({ path: '/Users/phil/.workbuddy/blobs/hcg-drill.png' });
  console.log('DRILL_OK ' + ok);
  console.log('ERRORS ' + (errors.length ? JSON.stringify(errors) : 'none'));
  await browser.close();
})().catch((e) => {
  console.error('FAIL ' + String(e));
  process.exit(1);
});
