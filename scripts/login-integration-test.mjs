#!/usr/bin/env node
const BE = process.env.API_BASE || 'http://localhost:43000';

async function main() {
  const login = await fetch(`${BE}/authenticator/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Hostname: 'localhost' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123456' }),
  });
  const loginJson = await login.json();
  const okLogin = login.status >= 200 && login.status < 300 && loginJson.code === 0 && loginJson.result?.token;
  const me = await fetch(`${BE}/authenticator/user/me`, {
    headers: { Authorization: `Bearer ${loginJson.result?.token}`, Hostname: 'localhost' },
  });
  const meJson = await me.json();
  const okMe = meJson.code === 0 && meJson.result?.username === 'admin';
  console.log(JSON.stringify({ login: okLogin, me: okMe, httpLogin: login.status, httpMe: me.status }, null, 2));
  process.exit(okLogin && okMe ? 0 : 1);
}
main();
