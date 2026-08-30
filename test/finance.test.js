import assert from 'node:assert/strict';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import { createDatabase, migrate, seedDemoData } from '../src/db.js';
import { financeDashboard } from '../src/finance-dashboard.js';

test('finance dashboard exposes a stable decision contract for every reporting period', () => {
  for (const period of ['mtd', 'qtd', 'ytd', '12m']) {
    const dashboard = financeDashboard({ period, reportingCurrency: 'USD' });
    assert.equal(dashboard.period.key, period);
    assert.equal(dashboard.reportingCurrency, 'USD');
    assert.equal(dashboard.demo, true);
    assert.equal(dashboard.sources.length, 4);
    assert.ok(dashboard.kpis.length >= 17);
    assert.equal(dashboard.cashForecast.length, 13);
    assert.equal(dashboard.fxExposure.map(row => row.currency).join(','), 'USD,INR,EUR,GBP');

    const billed = dashboard.kpis.find(kpi => kpi.id === 'billed-revenue').value.amount;
    const collected = dashboard.kpis.find(kpi => kpi.id === 'collected-revenue').value.amount;
    const collectionRate = dashboard.kpis.find(kpi => kpi.id === 'collection-rate').value.amount;
    assert.equal(billed, dashboard.revenueTrend.reduce((sum, row) => sum + row.billed, 0));
    assert.equal(collected, dashboard.revenueTrend.reduce((sum, row) => sum + row.collected, 0));
    assert.ok(Math.abs(collectionRate - collected / billed * 100) < 0.11);
  }

  assert.throws(() => financeDashboard({ period: 'weekly' }), /Choose MTD/);
  assert.throws(() => financeDashboard({ reportingCurrency: 'INR' }), /reporting currency is USD/);
});

test('CFO role migration preserves existing users and foreign-key relationships', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      password_hash TEXT NOT NULL
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE rules (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      keywords TEXT NOT NULL,
      sender_filter TEXT NOT NULL DEFAULT '',
      assignee_id INTEGER NOT NULL REFERENCES users(id),
      priority INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    INSERT INTO users VALUES
      (1, 'admin@example.test', 'Admin', 'AD', 'Operations', 'admin', 'hash'),
      (2, 'member@example.test', 'Member', 'ME', 'Finance', 'member', 'hash');
    INSERT INTO sessions VALUES ('session', 1, '2099-01-01T00:00:00.000Z');
    INSERT INTO rules VALUES (1, 'Invoice review', 'invoice', '', 2, 10, 1, '2026-01-01T00:00:00.000Z');
  `);

  migrate(db);
  db.prepare(`
    INSERT INTO users (email, name, initials, department, role, password_hash)
    VALUES ('cfo@example.test', 'CFO', 'CF', 'Finance', 'cfo', 'hash')
  `).run();

  assert.equal(db.prepare('SELECT count(*) AS count FROM users').get().count, 3);
  assert.equal(db.prepare('SELECT user_id FROM sessions WHERE id = ?').get('session').user_id, 1);
  assert.equal(db.prepare('SELECT assignee_id FROM rules WHERE id = 1').get().assignee_id, 2);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.close();
});

test('CFO account receives finance only while admins and members remain isolated', async context => {
  const db = createDatabase(':memory:');
  const [adminPasswordHash, memberPasswordHash, cfoPasswordHash] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('welcome123'),
    hashPassword('finance123'),
  ]);
  seedDemoData(db, { adminPasswordHash, memberPasswordHash, cfoPasswordHash });
  const server = createApp({
    db,
    mode: 'demo',
    integrations: {},
    syncRunner: { run: async () => ({ imported: 0, assigned: 0 }) },
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    db.close();
  });

  async function request(path, { method = 'GET', body, cookie } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';', 1)[0],
    };
  }

  async function login(email, password) {
    const response = await request('/api/login', { method: 'POST', body: { email, password } });
    assert.equal(response.status, 200);
    return response.cookie;
  }

  const cfoCookie = await login('cfo@lexflow.local', 'finance123');
  const adminCookie = await login('admin@lexflow.local', 'admin123');
  const memberCookie = await login('priya@lexflow.local', 'welcome123');

  const cfoBootstrap = await request('/api/bootstrap', { cookie: cfoCookie });
  assert.equal(cfoBootstrap.status, 200);
  assert.equal(cfoBootstrap.body.user.role, 'cfo');
  assert.equal(cfoBootstrap.body.mode, 'finance');
  assert.equal('emails' in cfoBootstrap.body, false);
  assert.equal('notifications' in cfoBootstrap.body, false);

  const finance = await request('/api/finance/dashboard?period=qtd&reportingCurrency=USD', { cookie: cfoCookie });
  assert.equal(finance.status, 200);
  assert.equal(finance.body.period.key, 'qtd');
  assert.equal((await request('/api/finance/dashboard', { cookie: adminCookie })).status, 403);
  assert.equal((await request('/api/finance/dashboard', { cookie: memberCookie })).status, 403);
  assert.equal((await request('/api/sync', { method: 'POST', cookie: cfoCookie })).status, 403);
});
