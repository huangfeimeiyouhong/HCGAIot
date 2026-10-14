/* 大屏 1920×1080 无头截图核验脚本(绕过 CLI 的浏览器启动问题) */
const PW = '/Users/phil/.workbuddy/binaries/node/versions/22.22.2-6/lib/node_modules/@playwright/cli/node_modules/playwright-core';
const { chromium } = require(PW);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.argv[2] || '/Users/phil/.workbuddy/blobs/hcg-shot.png';
const URL = process.argv[3] || 'http://localhost:9899/dashboard';

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
  page.on('requestfailed', (r) => errors.push('[requestfailed] ' + r.url()));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000); // 等轮询首屏数据 + 地图渲染 + 大屏缩放稳定

  // 溢出检测:滚动宽高是否超出 1920×1080 画布
  const overflow = await page.evaluate(() => {
    const wrapper = document.querySelector('.screen-wrapper');
    if (!wrapper) return { found: false };
    return {
      found: true,
      scrollW: wrapper.scrollWidth,
      scrollH: wrapper.scrollHeight,
      clientW: wrapper.clientWidth,
      clientH: wrapper.clientHeight,
    };
  });

  await page.screenshot({ path: OUT });
  console.log('SHOT_OK ' + OUT);
  console.log('OVERFLOW ' + JSON.stringify(overflow));
  console.log('ERRORS ' + (errors.length ? JSON.stringify(errors, null, 2) : 'none'));
  await browser.close();
})().catch((e) => {
  console.error('FAIL ' + String(e));
  process.exit(1);
});
