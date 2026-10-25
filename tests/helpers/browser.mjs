import { chromium } from 'playwright-core';

/** Local test infrastructure only; a supplied executable must be an operator-selected browser. */
export async function launchTestBrowser() {
  if (process.env.ALLBARKA_TEST_BROWSER) return chromium.launch({
    executablePath: process.env.ALLBARKA_TEST_BROWSER,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-zygote'],
  });
  return chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
    chromium.launch({ channel: 'msedge', headless: true })
  ).catch(() => chromium.launch({ headless: true }));
}
