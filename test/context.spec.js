const path = require('path');
const puppeteer = require('puppeteer');
const { buildNext, startNext, cleanup } = require('./utils');
const { default: fetch } = require('node-fetch');

const FIXTURE_PATH = path.resolve(__dirname, './__fixtures__/context');

afterAll(() => cleanup(FIXTURE_PATH));

describe('basic-app', () => {
  /**
   * @type {import('puppeteer').Browser}
   */
  let browser;
  /**
   * @type {import('./utils').RunningNextApp}
   */
  let app;

  beforeAll(async () => {
    await Promise.all([
      buildNext(FIXTURE_PATH),
      puppeteer.launch().then((b) => (browser = b)),
    ]);
    app = await startNext(FIXTURE_PATH);
  }, 30000);

  afterAll(async () => {
    await Promise.all([browser && browser.close(), app && app.kill()]);
  });

  test('should provide context when called through getServerSidProps', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(new URL('/getServerSideProps', app.url).toString());
      expect(await page.$('#has-context')).not.toBeNull();
    } finally {
      await page.close();
    }
  });

  test('should provide context through getIitialProps after page', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(new URL('/getInitialProps1', app.url).toString());
      expect(await page.$('#has-context')).not.toBeNull();
    } finally {
      await page.close();
    }
  });

  test('should provide context through getIitialProps before page', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(new URL('/getInitialProps2', app.url).toString());
      expect(await page.$('#has-context')).not.toBeNull();
    } finally {
      await page.close();
    }
  });

  test('should provide context through getIitialProps as static class property', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(new URL('/getInitialProps3', app.url).toString());
      expect(await page.$('#has-context')).not.toBeNull();
    } finally {
      await page.close();
    }
  });

  test('should have context in api routes', async () => {
    const response = await fetch(
      new URL('/api/classicApi', app.url).toString()
    );
    expect(response).toHaveProperty('ok', true);
    const result = await response.json();
    expect(result).toHaveProperty('apiHasContext', true);
    expect(result).toHaveProperty('rpcHasContext', true);
  });

  test('should have context in rpc routes', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(new URL('/callRpc', app.url).toString());
      await page.waitForSelector('#has-context');
      expect(await page.$('#has-context')).not.toBeNull();
    } finally {
      await page.close();
    }
  });

  test('should be able to set cookies', async () => {
    const page = await browser.newPage();
    try {
      const initialPageCookies = await page.cookies();
      expect(initialPageCookies).not.toContainEqual(
        expect.objectContaining({ name: 'cookieName' })
      );

      await page.goto(new URL('/cookies', app.url).toString());
      await page.waitForSelector('#final-value');
      const initialValue = await page.$eval(
        '#initial-value',
        (e) => e.textContent
      );
      const finalValue = await page.$eval('#final-value', (e) => e.textContent);
      expect(initialValue).toBe('');
      expect(finalValue).toBe('some cookie value');

      const finalPageCookies = await page.cookies();
      expect(finalPageCookies).toContainEqual(
        expect.objectContaining({
          name: 'cookieName',
          value: 'some cookie value',
        })
      );
    } finally {
      await page.close();
    }
  });
});
