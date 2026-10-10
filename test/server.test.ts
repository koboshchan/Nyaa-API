import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

process.env.PORT = '0';
process.env.HOST = '127.0.0.1';
const { server } = await import('../src/server.js');
if (!server.listening) await once(server, 'listening');
after(() => new Promise<void>((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
}));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
async function root(headers: Record<string, string> = {}) {
  const response = await fetch(base, { headers });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ['app', 'ip', 'uptime', 'version']);
  assert.equal(body.app, 'Nyaa API');
  assert.equal(body.version, '2.0.1');
  assert.equal(typeof body.uptime, 'number');
  return body.ip;
}
test('root uses a single trimmed XFF address before X-Real-IP', async () => {
  assert.equal(await root({ 'X-Forwarded-For': ' 203.0.113.7 ', 'X-Real-IP': '198.51.100.1' }), '203.0.113.7');
});
test('root uses only the first address of multiple XFF addresses', async () => {
  assert.equal(await root({ 'X-Forwarded-For': ' 2001:db8::7 , 198.51.100.2' }), '2001:db8::7');
});
test('garbage first XFF address falls back to validated X-Real-IP', async () => {
  for (const value of ['garbage, 203.0.113.7', '999.1.1.1', '203.0.113.7:80', ', 203.0.113.7']) {
    assert.equal(await root({ 'X-Forwarded-For': value, 'X-Real-IP': ' 198.51.100.9 ' }), '198.51.100.9');
  }
});
test('absent XFF uses X-Real-IP, including IPv6', async () => {
  assert.equal(await root({ 'X-Real-IP': '2001:db8::9' }), '2001:db8::9');
});
test('absent or invalid proxy addresses fall back to socket address', async () => {
  assert.equal(await root(), '127.0.0.1');
  assert.equal(await root({ 'X-Forwarded-For': 'garbage', 'X-Real-IP': 'also garbage' }), '127.0.0.1');
  assert.equal(await root({ 'X-Forwarded-For': '' }), '127.0.0.1');
});
