#!/usr/bin/env node
/**
 * Phase 3 — E2E API flow validation (no FE rescan).
 */
const BE = process.env.API_BASE || 'http://localhost:43000';
const HOST = 'localhost';

async function req(method, path, { token, body } = {}) {
  const headers = { Accept: 'application/json', Hostname: HOST };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, pass: res.ok && json?.code === 0 };
}

const flows = [];

async function main() {
  const login = await req('POST', '/authenticator/user/login', {
    body: { username: 'admin', password: 'Admin@123456' },
  });
  const token = login.json?.result?.token;
  flows.push({
    flow: 'Flow 1 — Login → Customer List → Customer Detail',
    steps: [
      { step: 'POST /authenticator/user/login', ...login, pass: login.pass },
      { step: 'GET /authenticator/user/me', ...(await req('GET', '/authenticator/user/me', { token })) },
      { step: 'GET /adminapi/customer/list_paid?page=1&limit=10', ...(await req('GET', '/adminapi/customer/list_paid?page=1&limit=10', { token })) },
    ],
  });
  const list = await req('GET', '/adminapi/customer/list_paid?page=1&limit=1', { token });
  const cid = list.json?.result?.items?.[0]?.id;
  if (cid) {
    flows[0].steps.push({
      step: `GET /adminapi/customer/get?id=${cid}`,
      ...(await req('GET', `/adminapi/customer/get?id=${cid}`, { token })),
    });
  }

  const woList = await req('GET', '/adminapi/workOrder/list?page=1&limit=1', { token });
  flows.push({
    flow: 'Flow 2 — Login → Customer → Work Order → Notification',
    steps: [
      { step: 'GET /adminapi/workOrder/list', ...woList },
      { step: 'GET /notification/notificationHistory/count', ...(await req('GET', '/notification/notificationHistory/count', { token })) },
      { step: 'GET /notification/notificationHistory/list?page=1&limit=5', ...(await req('GET', '/notification/notificationHistory/list?page=1&limit=5', { token })) },
    ],
  });

  const campList = await req('GET', '/adminapi/campaign/list?page=1&limit=5', { token });
  const campId = campList.json?.result?.items?.[0]?.id;
  flows.push({
    flow: 'Flow 3 — Login → Campaign → Opportunity',
    steps: [
      { step: 'GET /adminapi/campaign/list', ...campList },
      ...(campId ? [{ step: 'GET /adminapi/campaign/get', ...(await req('GET', `/adminapi/campaign/get?id=${campId}`, { token })) }] : []),
      { step: 'GET /adminapi/campaignOpportunity/list?page=1&limit=5', ...(await req('GET', '/adminapi/campaignOpportunity/list?page=1&limit=5', { token })) },
    ],
  });

  const bpmList = await req('GET', '/bpmapi/businessProcess/list?page=1&limit=5', { token });
  const bpmId = bpmList.json?.result?.items?.[0]?.id;
  flows.push({
    flow: 'Flow 4 — Login → BPM List → BPM Detail',
    steps: [
      { step: 'GET /bpmapi/businessProcess/list', ...bpmList },
      ...(bpmId ? [
        { step: 'GET /bpmapi/businessProcess/get', ...(await req('GET', `/bpmapi/businessProcess/get?id=${bpmId}`, { token })) },
        { step: 'GET /bpmapi/businessProcess/detail', ...(await req('GET', `/bpmapi/businessProcess/detail?id=${bpmId}`, { token })) },
      ] : []),
    ],
  });

  flows.push({
    flow: 'Flow 5 — Login → Employee Info → Employee List',
    steps: [
      { step: 'GET /adminapi/employee/info', ...(await req('GET', '/adminapi/employee/info', { token })) },
      { step: 'GET /adminapi/employee/list?page=1&limit=10', ...(await req('GET', '/adminapi/employee/list?page=1&limit=10', { token })) },
      { step: 'GET /adminapi/employee/roles', ...(await req('GET', '/adminapi/employee/roles', { token })) },
    ],
  });

  const allSteps = flows.flatMap((f) => f.steps);
  const passed = allSteps.filter((s) => s.pass).length;
  const failed = allSteps.filter((s) => !s.pass);

  const summary = {
    be: BE,
    totalSteps: allSteps.length,
    passed,
    failed: failed.length,
    failedSteps: failed.map((s) => ({ step: s.step, status: s.status, message: s.json?.message })),
    flowResults: flows.map((f) => ({
      flow: f.flow,
      pass: f.steps.every((s) => s.pass),
      steps: f.steps.map((s) => ({ step: s.step, pass: s.pass, status: s.status })),
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main();
