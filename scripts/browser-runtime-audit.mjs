#!/usr/bin/env node
/**
 * Headless browser pass: inject real JWT, visit CRM routes, capture network + console.
 * CRM must run with APP_* pointing at BE (e.g. port 43000).
 */
import { chromium } from 'playwright';

const CRM = process.env.CRM_URL || 'http://localhost:5173';
const BASENAME = process.env.CRM_BASENAME || '/crm';
const BE = process.env.API_BASE || 'http://localhost:43000';

const PAGES = [
  { module: 'login', path: '/login', needsAuth: false },
  { module: 'customer', path: '/customer', needsAuth: true },
  { module: 'employee', path: '/setting_account', needsAuth: true },
  { module: 'notification', path: '/customer', needsAuth: true, note: 'badge API on bootstrap only' },
  { module: 'bpm', path: '/bpm/manage_processes', needsAuth: true },
  { module: 'campaign', path: '/crm_campaign', needsAuth: true },
  { module: 'workOrder', path: '/bpm/pending_tasks', needsAuth: true },
];

async function login() {
  const res = await fetch(`${BE}/authenticator/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Hostname: 'localhost' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123456' }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`Login failed: ${json.message}`);
  return json.result;
}

async function main() {
  const auth = await login();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: 'token', value: auth.token, domain: 'localhost', path: '/' },
    {
      name: 'user',
      value: JSON.stringify({
        id: auth.user?.id ?? auth.userId,
        name: auth.user?.name ?? 'Admin',
        phone: '',
        avatar: '',
        gender: 0,
        role: 'admin',
      }),
      domain: 'localhost',
      path: '/',
    },
  ]);

  const report = { crm: CRM, be: BE, pages: [], consoleErrors: [], reactErrors: [] };

  for (const pageDef of PAGES) {
    const page = await context.newPage();
    const network = [];
    const consoleMsgs = [];

    page.on('requestfinished', async (req) => {
      const url = req.url();
      if (!url.includes('localhost') && !url.includes('5173')) return;
      if (url.includes('.hot-update') || url.includes('@vite') || url.includes('/src/')) return;
      if (!/\/(adminapi|authenticator|notification|bpmapi)\//.test(url)) return;
      try {
        const res = await req.response();
        let bodyPreview = null;
        let code = null;
        if (res) {
          const ct = res.headers()['content-type'] || '';
          if (ct.includes('json')) {
            const text = await res.text().catch(() => '');
            try {
              const j = JSON.parse(text);
              code = j.code;
              bodyPreview = JSON.stringify(j.result).slice(0, 120);
            } catch {
              bodyPreview = text.slice(0, 80);
            }
          }
        }
        network.push({
          method: req.method(),
          url: url.replace(BE, '').replace(CRM, ''),
          status: res?.status() ?? 0,
          code,
          preview: bodyPreview,
        });
      } catch {
        /* ignore */
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMsgs.push({ page: pageDef.path, type: msg.type(), text: msg.text() });
      }
    });
    page.on('pageerror', (err) => {
      report.reactErrors.push({ page: pageDef.path, message: err.message });
    });

    try {
      const fullPath = `${BASENAME}${pageDef.path}`.replace(/\/+/g, '/');
      await page.goto(`${CRM}${fullPath}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2500);
    } catch (e) {
      report.pages.push({
        ...pageDef,
        loadError: e.message,
        network,
        console: consoleMsgs,
      });
      await page.close();
      continue;
    }

    report.pages.push({
      ...pageDef,
      title: await page.title(),
      network,
      console: consoleMsgs,
      failedApi: network.filter((n) => n.status >= 400 || n.code === 9999 || n.status === 0),
    });
    report.consoleErrors.push(...consoleMsgs);
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
