#!/usr/bin/env node
/**
 * Simulates CRM fetchConfig URL resolution + module bootstrap APIs.
 * Compares FE-configured port (4000) vs actual BE port (43000).
 */
const FE_BASE = 'http://localhost:4000';
const BE_BASE = process.env.API_BASE || 'http://localhost:43000';
const HOSTNAME = 'localhost';

const MODULES = {
  bootstrap: [
    { name: 'employee.info', method: 'GET', path: '/adminapi/employee/info' },
    { name: 'employee.roles', method: 'GET', path: '/adminapi/employee/roles' },
    { name: 'notification.count', method: 'GET', path: '/notification/notificationHistory/count' },
  ],
  login: [
    { name: 'user.login', method: 'POST', path: '/authenticator/user/login', body: { username: 'admin', password: 'Admin@123456', hostname: HOSTNAME }, auth: false },
  ],
  customer: [
    { name: 'customer.list_paid', method: 'GET', path: '/adminapi/customer/list_paid?page=1&limit=10' },
    { name: 'customer.filterTable', method: 'GET', path: '/adminapi/customer/list?page=1&limit=5', optional: true },
  ],
  employee: [
    { name: 'employee.list', method: 'GET', path: '/adminapi/employee/list?page=1&limit=10' },
    { name: 'employee.info', method: 'GET', path: '/adminapi/employee/info' },
  ],
  notification: [
    { name: 'notification.list', method: 'GET', path: '/notification/notificationHistory/list?page=1&limit=10' },
    { name: 'notification.count', method: 'GET', path: '/notification/notificationHistory/count' },
  ],
  bpm: [
    { name: 'businessProcess.list', method: 'GET', path: '/bpmapi/businessProcess/list?page=1&limit=10' },
    { name: 'workflow.list', method: 'GET', path: '/bpmapi/workflow/list', optional: true },
  ],
  campaign: [
    { name: 'crmCampaign.list (FE page)', method: 'GET', path: '/adminapi/crmCampaign/list?page=1&limit=10' },
    { name: 'campaign.list (marketing)', method: 'GET', path: '/adminapi/campaign/list?page=1&limit=10' },
  ],
  workOrder: [
    { name: 'workOrder.list', method: 'GET', path: '/adminapi/workOrder/list?page=1&limit=10&status=5' },
    { name: 'workOrder.listV2', method: 'GET', path: '/adminapi/workOrder/listV2?page=1&limit=10', optional: true },
  ],
};

async function req(base, ep, token) {
  const headers = { Accept: 'application/json', Hostname: HOSTNAME };
  if (ep.body) headers['Content-Type'] = 'application/json';
  if (token && ep.auth !== false) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${base}${ep.path}`, {
      method: ep.method,
      headers,
      body: ep.body ? JSON.stringify(ep.body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    let json = null;
    const text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text.slice(0, 200) }; }
    return { ok: true, status: res.status, json, networkError: null };
  } catch (e) {
    return { ok: false, status: 0, json: null, networkError: e.cause?.code || e.message };
  }
}

function analyze(ep, fe, be) {
  const issues = [];
  if (!fe.ok) issues.push({ severity: 'P0', msg: `FE URL (${FE_BASE}): ${fe.networkError || 'failed'}` });
  if (be.ok && be.status === 200 && be.json?.code === 0) {
    // contract hints
    const r = be.json.result;
    if (ep.name.includes('customer.list') && r?.items?.[0]?.id) {
      const id = r.items[0].id;
      if (typeof id === 'string' && id.includes('-')) issues.push({ severity: 'P1', msg: 'Customer id is UUID string; FE uses number (+id)' });
      if (r.items[0].gender && typeof r.items[0].gender === 'string') issues.push({ severity: 'P1', msg: `gender is string "${r.items[0].gender}"; FE expects number` });
    }
    if (ep.name === 'notification.count' && typeof r !== 'number') issues.push({ severity: 'P1', msg: `count result type ${typeof r}, FE expects number` });
    if (ep.name.includes('businessProcess.list') && r?.items) {
      const item = r.items[0];
      if (item && !('nodeCount' in item) && !('_count' in item)) issues.push({ severity: 'P3', msg: 'BPM list item shape may differ from MSW mocks' });
    }
  } else if (be.ok && be.json?.code !== 0) {
    issues.push({ severity: 'P1', msg: `BE business error: ${be.json?.message}` });
  } else if (be.status === 404) {
    issues.push({ severity: ep.optional ? 'P3' : 'P1', msg: 'BE 404 Not Found' });
  } else if (be.status === 401) {
    issues.push({ severity: 'P1', msg: 'BE 401 Unauthorized' });
  }
  return issues;
}

async function main() {
  let token = null;
  const loginBe = await req(BE_BASE, MODULES.login[0], null);
  if (loginBe.json?.result?.token) token = loginBe.json.result.token;

  const report = { feBase: FE_BASE, beBase: BE_BASE, tokenObtained: !!token, modules: {} };

  for (const [mod, eps] of Object.entries(MODULES)) {
    report.modules[mod] = [];
    for (const ep of eps) {
      const fe = await req(FE_BASE, ep, token);
      const be = await req(BE_BASE, ep, token);
      report.modules[mod].push({
        api: ep.name,
        path: ep.path,
        fe: { status: fe.status, networkError: fe.networkError, code: fe.json?.code },
        be: { status: be.status, code: be.json?.code, message: be.json?.message, resultType: typeof be.json?.result, resultPreview: JSON.stringify(be.json?.result).slice(0, 180) },
        issues: analyze(ep, fe, be),
      });
    }
  }

  // Customer detail with numeric id simulation
  if (token) {
    const customers = await req(BE_BASE, { method: 'GET', path: '/adminapi/customer/list_paid?page=1&limit=1' }, token);
    const uuid = customers.json?.result?.items?.[0]?.id;
    if (uuid) {
      const detailOk = await req(BE_BASE, { method: 'GET', path: `/adminapi/customer/get?id=${uuid}` }, token);
      const detailBad = await req(BE_BASE, { method: 'GET', path: '/adminapi/customer/get?id=NaN' }, token);
      report.customerDetail = {
        uuid,
        detailWithUuid: { status: detailOk.status, code: detailOk.json?.code },
        detailWithPlusId: { status: detailBad.status, code: detailBad.json?.code, note: 'FE uses CustomerService.detail(+id) from route param' },
      };
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
