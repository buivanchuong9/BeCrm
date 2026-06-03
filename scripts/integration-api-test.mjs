#!/usr/bin/env node
/**
 * Phase 2 — Automated API validation against real BE (no mocks).
 */
const BE = process.env.API_BASE || 'http://localhost:43000';
const HOST = 'localhost';
const USER = process.env.TEST_USER || 'admin';
const PASS = process.env.TEST_PASS || 'Admin@123456';

const ENDPOINTS = [
  // AUTH
  { group: 'AUTH', name: 'login', method: 'POST', path: '/authenticator/user/login', auth: false, body: { username: USER, password: PASS } },
  { group: 'AUTH', name: 'me', method: 'GET', path: '/authenticator/user/me', needsToken: true },
  { group: 'AUTH', name: 'refresh', method: 'POST', path: '/authenticator/user/refresh', auth: false, body: { refreshToken: '__REFRESH__' }, dynamic: true },
  // CUSTOMER
  { group: 'CUSTOMER', name: 'list', method: 'GET', path: '/adminapi/customer/list?page=1&limit=5', needsToken: true },
  { group: 'CUSTOMER', name: 'list_paid', method: 'GET', path: '/adminapi/customer/list_paid?page=1&limit=5', needsToken: true },
  { group: 'CUSTOMER', name: 'get', method: 'GET', path: '/adminapi/customer/get?id=__CID__', needsToken: true, dynamic: true },
  // EMPLOYEE
  { group: 'EMPLOYEE', name: 'info', method: 'GET', path: '/adminapi/employee/info', needsToken: true },
  { group: 'EMPLOYEE', name: 'list', method: 'GET', path: '/adminapi/employee/list?page=1&limit=5', needsToken: true },
  { group: 'EMPLOYEE', name: 'roles', method: 'GET', path: '/adminapi/employee/roles', needsToken: true },
  // NOTIFICATION
  { group: 'NOTIFICATION', name: 'list', method: 'GET', path: '/notification/notificationHistory/list?page=1&limit=5', needsToken: true },
  { group: 'NOTIFICATION', name: 'count', method: 'GET', path: '/notification/notificationHistory/count', needsToken: true },
  { group: 'NOTIFICATION', name: 'get', method: 'GET', path: '/notification/notificationHistory/get?id=__NID__', needsToken: true, dynamic: true, optional: true },
  // WORK ORDER
  { group: 'WORK_ORDER', name: 'list', method: 'GET', path: '/adminapi/workOrder/list?page=1&limit=5&status=5', needsToken: true },
  { group: 'WORK_ORDER', name: 'listV2', method: 'GET', path: '/adminapi/workOrder/listV2?page=1&limit=5', needsToken: true },
  { group: 'WORK_ORDER', name: 'get', method: 'GET', path: '/adminapi/workOrder/get?id=__WID__', needsToken: true, dynamic: true, optional: true },
  // BPM
  { group: 'BPM', name: 'businessProcess.list', method: 'GET', path: '/bpmapi/businessProcess/list?page=1&limit=5', needsToken: true },
  { group: 'BPM', name: 'businessProcess.get', method: 'GET', path: '/bpmapi/businessProcess/get?id=__BPID__', needsToken: true, dynamic: true },
  { group: 'BPM', name: 'businessProcess.detail', method: 'GET', path: '/bpmapi/businessProcess/detail?id=__BPID__', needsToken: true, dynamic: true },
  { group: 'BPM', name: 'workflow.list', method: 'GET', path: '/bpmapi/workflow/list', needsToken: true, optional: true },
  // CAMPAIGN (marketing)
  { group: 'CAMPAIGN', name: 'campaign.list', method: 'GET', path: '/adminapi/campaign/list?page=1&limit=5', needsToken: true },
  { group: 'CAMPAIGN', name: 'campaign.get', method: 'GET', path: '/adminapi/campaign/get?id=__CAMPID__', needsToken: true, dynamic: true },
  { group: 'CAMPAIGN', name: 'campaignApproach.list', method: 'GET', path: '/adminapi/campaignApproach/list?campaignId=__CAMPID__', needsToken: true, dynamic: true, optional: true },
  { group: 'CAMPAIGN', name: 'marketingSource.list', method: 'GET', path: '/adminapi/marketingSource/list', needsToken: true },
  { group: 'CAMPAIGN', name: 'campaignOpportunity.list', method: 'GET', path: '/adminapi/campaignOpportunity/list?page=1&limit=5', needsToken: true },
  // CRM campaign categories (FE CrmCampaignList)
  { group: 'CAMPAIGN', name: 'crmCampaign.list', method: 'GET', path: '/adminapi/crmCampaign/list?page=1&limit=5', needsToken: true },
];

async function call(ep, token, vars) {
  let path = ep.path;
  if (ep.dynamic) {
    for (const [k, v] of Object.entries(vars)) path = path.replace(`__${k}__`, v ?? '');
  }
  const headers = { Accept: 'application/json', Hostname: HOST };
  if (ep.body) headers['Content-Type'] = 'application/json';
  if (token && ep.auth !== false) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${BE}${path}`, {
      method: ep.method,
      headers,
      body: ep.body ? JSON.stringify(
        ep.name === 'refresh' ? { refreshToken: vars.REFRESH } : ep.body,
      ) : undefined,
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text.slice(0, 300) }; }
    const pass = res.status >= 200 && res.status < 300 && json?.code === 0;
    return { pass, httpStatus: res.status, code: json?.code, message: json?.message, result: json?.result };
  } catch (e) {
    return { pass: false, httpStatus: 0, code: null, message: e.message, result: null };
  }
}

async function main() {
  const login = await call(ENDPOINTS.find((e) => e.name === 'login'), null, {});
  const token = login.result?.token;
  const refresh = login.result?.refreshToken;
  const vars = { REFRESH: refresh || '' };

  const listPaid = await call(
    { method: 'GET', path: '/adminapi/customer/list_paid?page=1&limit=1', needsToken: true },
    token,
    {},
  );
  vars.CID = listPaid.result?.items?.[0]?.id || '';

  const bpList = await call(
    { method: 'GET', path: '/bpmapi/businessProcess/list?page=1&limit=1', needsToken: true },
    token,
    {},
  );
  vars.BPID = bpList.result?.items?.[0]?.id || '';

  const campList = await call(
    { method: 'GET', path: '/adminapi/campaign/list?page=1&limit=1', needsToken: true },
    token,
    {},
  );
  vars.CAMPID = campList.result?.items?.[0]?.id || '';

  const results = [];
  for (const ep of ENDPOINTS) {
    if (ep.name === 'login') {
      results.push({ ...ep, ...login, pass: login.pass });
      continue;
    }
    if (!token && ep.needsToken) {
      results.push({ ...ep, pass: false, httpStatus: 0, message: 'No token from login' });
      continue;
    }
    const r = await call(ep, token, vars);
    const pass = r.pass;
    results.push({ group: ep.group, name: ep.name, method: ep.method, path: ep.path, optional: ep.optional, ...r, pass });
  }

  const tested = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass && !r.optional).length;
  const optionalFailed = results.filter((r) => !r.pass && r.optional).length;

  const out = { be: BE, tested, passed, failed, optionalFailed, results, vars: { customerId: vars.CID, bpmId: vars.BPID, campaignId: vars.CAMPID } };
  console.log(JSON.stringify(out, null, 2));
}

main();
