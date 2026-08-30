import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import { createDatabase, seedDemoData } from '../src/db.js';
import { createVacationRunner, getBriefing, vacationPayload } from '../src/vacation.js';
import { assignEmailManually, syncMailbox } from '../src/workflows.js';

function source(messages) {
  return {
    cursorKey: `vacation-test:${messages.map(message => message.providerId).join(',')}`,
    async fetchChanges() { return { messages, nextCursor: 'done' }; },
  };
}

function mail(providerId, subject, receivedAt) {
  return {
    providerId,
    subject,
    senderName: 'Customer Finance',
    senderAddress: 'finance@example.test',
    preview: 'Urgent decision required before the deadline.',
    receivedAt,
    outlookUrl: `https://outlook.office.com/mail/${providerId}`,
  };
}

test('active Microsoft OOO holds routed work, blocks manual assignment, and produces one return briefing', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  seedDemoData(db);
  const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
  const maya = db.prepare("SELECT * FROM users WHERE email = 'maya@lexflow.local'").get();
  db.prepare('UPDATE users SET microsoft_principal = ? WHERE id = ?').run('maya@example.com', maya.id);
  db.prepare(`
    INSERT INTO rules (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
    VALUES ('Urgent finance', 'urgent,deadline', '', ?, 1, 1, ?)
  `).run(maya.id, '2026-08-10T00:00:00.000Z');

  let now = new Date('2026-08-14T10:00:00.000Z');
  let replySetting = {
    status: 'scheduled',
    startsAt: '2026-08-14T09:00:00.000Z',
    endsAt: '2026-08-14T17:00:00.000Z',
    timezone: 'India Standard Time',
  };
  const provider = {
    configured: true,
    async fetchVacation() { return replySetting; },
    async fetchMeetings() {
      return [
        {
          id: 'decision-1', subject: 'Urgent pricing decision', isOrganizer: true,
          responseStatus: { response: 'accepted' }, showAs: 'busy', type: 'occurrence',
          organizer: { emailAddress: { name: 'Maya Shah', address: 'maya@example.com' } },
          start: { dateTime: '2026-08-14T11:00:00Z', timeZone: 'UTC' },
          end: { dateTime: '2026-08-14T11:30:00Z', timeZone: 'UTC' },
          location: { displayName: 'Teams' }, sensitivity: 'normal',
          onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/example' },
        },
        {
          id: 'private-1', subject: 'Acquisition discussion', isOrganizer: false,
          responseStatus: { response: 'tentative' }, showAs: 'busy', type: 'singleInstance',
          organizer: { emailAddress: { name: 'Chief Executive', address: 'ceo@example.com' } },
          start: { dateTime: '2026-08-14T12:00:00Z', timeZone: 'UTC' },
          end: { dateTime: '2026-08-14T12:30:00Z', timeZone: 'UTC' },
          location: { displayName: 'Board room' }, sensitivity: 'private',
        },
        {
          id: 'declined-1', subject: 'Optional session', isOrganizer: false,
          responseStatus: { response: 'declined' }, showAs: 'busy',
          start: { dateTime: '2026-08-14T13:00:00Z', timeZone: 'UTC' },
          end: { dateTime: '2026-08-14T13:30:00Z', timeZone: 'UTC' },
        },
      ];
    },
  };
  const runner = createVacationRunner({ db, provider, clock: () => new Date(now) });

  await runner.run();
  assert.equal(vacationPayload(db, maya.id).period.status, 'active');
  const sync = await syncMailbox({ db, source: source([mail('away-mail', 'Urgent deadline approval', '2026-08-14T09:30:00.000Z')]) });
  assert.deepEqual(sync, { imported: 1, assigned: 0 });
  const heldEmail = db.prepare("SELECT * FROM emails WHERE provider_id = 'away-mail'").get();
  assert.equal(heldEmail.status, 'unassigned');
  assert.equal(db.prepare("SELECT status FROM vacation_email_holds WHERE email_id = ?").get(heldEmail.id).status, 'held');
  assert.throws(() => assignEmailManually({
    db, emailId: heldEmail.id, assigneeId: maya.id, adminId: admin.id, now,
  }), error => error.code === 'MEMBER_AWAY' && error.status === 409);

  now = new Date('2026-08-14T17:05:00.000Z');
  replySetting = { status: 'disabled', startsAt: null, endsAt: null, timezone: 'India Standard Time' };
  await runner.run();

  const releasedEmail = db.prepare('SELECT status, assignee_id FROM emails WHERE id = ?').get(heldEmail.id);
  assert.equal(releasedEmail.status, 'assigned');
  assert.equal(releasedEmail.assignee_id, maya.id);
  assert.equal(db.prepare('SELECT status FROM vacation_email_holds WHERE email_id = ?').get(heldEmail.id).status, 'released');
  const briefingRow = db.prepare('SELECT * FROM return_briefings WHERE user_id = ?').get(maya.id);
  const briefing = getBriefing(db, maya.id, briefingRow.id);
  assert.equal(briefing.status, 'ready');
  assert.equal(briefing.items.filter(item => item.type === 'meeting').length, 2);
  assert.equal(briefing.items.find(item => item.meetingId === 2)?.title, 'Private event');
  assert.equal(briefing.items[0].priority.level, 'high');
  assert.ok(briefing.items[0].priority.reasons.length > 0);
  const notifications = db.prepare('SELECT kind, email_id, briefing_id FROM notifications WHERE user_id = ?').all(maya.id);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].kind, 'return_briefing');
  assert.equal(notifications[0].email_id, null);
  assert.equal(notifications[0].briefing_id, briefing.id);

  await runner.run();
  assert.equal(db.prepare('SELECT count(*) AS count FROM return_briefings').get().count, 1);
  assert.equal(db.prepare("SELECT count(*) AS count FROM notifications WHERE kind = 'return_briefing'").get().count, 1);
});

test('calendar failure publishes an email-only briefing and later merges meetings idempotently', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  seedDemoData(db);
  const maya = db.prepare("SELECT * FROM users WHERE email = 'maya@lexflow.local'").get();
  db.prepare('UPDATE users SET microsoft_principal = ? WHERE id = ?').run('maya@example.com', maya.id);
  db.prepare(`
    INSERT INTO vacation_periods
      (user_id, provider, provider_key, status, starts_at, ends_at, timezone, first_detected_at, last_detected_at)
    VALUES (?, 'microsoft', 'ended', 'active', ?, NULL, 'UTC', ?, ?)
  `).run(maya.id, '2026-08-10T09:00:00.000Z', '2026-08-10T09:00:00.000Z', '2026-08-10T09:00:00.000Z');
  let calendarWorks = false;
  const provider = {
    configured: true,
    async fetchVacation() { return { status: 'disabled', timezone: 'UTC' }; },
    async fetchMeetings() {
      if (!calendarWorks) throw new Error('calendar unavailable');
      return [{
        id: 'retry-meeting', subject: 'Decision checkpoint', isOrganizer: true,
        responseStatus: { response: 'accepted' }, showAs: 'busy', type: 'singleInstance',
        organizer: { emailAddress: { name: 'Maya Shah', address: 'maya@example.com' } },
        start: { dateTime: '2026-08-10T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2026-08-10T10:30:00Z', timeZone: 'UTC' },
      }];
    },
  };
  let now = new Date('2026-08-10T17:00:00.000Z');
  const runner = createVacationRunner({ db, provider, clock: () => new Date(now) });
  await runner.run();
  assert.equal(db.prepare('SELECT status FROM return_briefings').get().status, 'partial');

  calendarWorks = true;
  now = new Date('2026-08-10T17:05:00.000Z');
  await runner.run();
  assert.equal(db.prepare('SELECT status FROM return_briefings').get().status, 'ready');
  assert.equal(db.prepare('SELECT count(*) AS count FROM vacation_meetings').get().count, 1);
  await runner.run();
  assert.equal(db.prepare('SELECT count(*) AS count FROM vacation_meetings').get().count, 1);
});

test('scheduled, changed, indefinite, ended, and provider-error states remain singular and observable', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  seedDemoData(db);
  const maya = db.prepare("SELECT * FROM users WHERE email = 'maya@lexflow.local'").get();
  db.prepare('UPDATE users SET microsoft_principal = ? WHERE id = ?').run('maya@example.com', maya.id);
  let now = new Date('2026-08-12T08:00:00.000Z');
  let setting = {
    status: 'scheduled', startsAt: '2026-08-13T09:00:00.000Z',
    endsAt: '2026-08-13T17:00:00.000Z', timezone: 'UTC',
  };
  let fails = false;
  const provider = {
    configured: true,
    async fetchVacation() {
      if (fails) throw new Error('Bearer secret-token provider unavailable');
      return setting;
    },
    async fetchMeetings() { return []; },
  };
  const runner = createVacationRunner({ db, provider, clock: () => new Date(now) });
  await runner.run();
  assert.equal(vacationPayload(db, maya.id).period.status, 'scheduled');

  now = new Date('2026-08-13T10:00:00.000Z');
  setting = {
    status: 'scheduled', startsAt: '2026-08-13T09:30:00.000Z',
    endsAt: '2026-08-13T18:00:00.000Z', timezone: 'UTC',
  };
  await runner.run();
  assert.equal(db.prepare("SELECT count(*) AS count FROM vacation_periods WHERE status = 'active'").get().count, 1);
  assert.equal(db.prepare("SELECT count(*) AS count FROM vacation_periods WHERE status = 'scheduled'").get().count, 0);

  now = new Date('2026-08-13T11:00:00.000Z');
  setting = { status: 'alwaysEnabled', startsAt: null, endsAt: null, timezone: 'UTC' };
  await runner.run();
  assert.equal(db.prepare("SELECT count(*) AS count FROM vacation_periods WHERE status = 'active'").get().count, 1);
  const activeStart = db.prepare("SELECT starts_at FROM vacation_periods WHERE status = 'active'").get().starts_at;
  assert.equal(activeStart, '2026-08-13T09:30:00.000Z');

  now = new Date('2026-08-13T16:00:00.000Z');
  setting = { status: 'disabled', startsAt: null, endsAt: null, timezone: 'UTC' };
  await runner.run();
  assert.equal(db.prepare("SELECT count(*) AS count FROM vacation_periods WHERE status = 'active'").get().count, 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM return_briefings').get().count, 1);

  fails = true;
  now = new Date('2026-08-13T16:05:00.000Z');
  const result = await runner.run();
  assert.equal(result.failed, 1);
  const sync = db.prepare('SELECT status, last_error FROM vacation_sync_state WHERE user_id = ?').get(maya.id);
  assert.equal(sync.status, 'error');
  assert.doesNotMatch(sync.last_error, /secret-token/);
  assert.match(sync.last_error, /Bearer \[redacted\]/);
});

test('manual switch schedules OOO, takes assignment control, and creates one summary when turned off', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  seedDemoData(db);
  const maya = db.prepare("SELECT * FROM users WHERE email = 'maya@lexflow.local'").get();
  let now = new Date('2026-08-20T09:00:00.000Z');
  const runner = createVacationRunner({
    db,
    provider: { configured: false },
    clock: () => new Date(now),
  });

  const enabled = await runner.setManualVacation(maya.id, {
    enabled: true,
    startsAt: '2026-08-20T09:00:00.000Z',
    endsAt: '2026-08-27T09:00:00.000Z',
  });
  assert.equal(enabled.provider, 'manual');
  assert.equal(enabled.manual.enabled, true);
  assert.equal(enabled.period.status, 'active');
  assert.equal(db.prepare('SELECT enabled FROM vacation_manual_settings WHERE user_id = ?').get(maya.id).enabled, 1);

  now = new Date('2026-08-21T10:00:00.000Z');
  const disabled = await runner.setManualVacation(maya.id, { enabled: false });
  assert.equal(disabled.manual.enabled, false);
  assert.equal(db.prepare("SELECT count(*) AS count FROM vacation_periods WHERE status = 'active'").get().count, 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM return_briefings WHERE user_id = ?').get(maya.id).count, 1);
  assert.equal(db.prepare("SELECT count(*) AS count FROM notifications WHERE user_id = ? AND kind = 'return_briefing'").get(maya.id).count, 1);

  await runner.setManualVacation(maya.id, {
    enabled: true,
    startsAt: '2026-08-22T09:00:00.000Z',
    endsAt: '2026-08-23T09:00:00.000Z',
  });
  assert.equal(vacationPayload(db, maya.id).period.status, 'scheduled');
  now = new Date('2026-08-22T09:01:00.000Z');
  await runner.run();
  assert.equal(vacationPayload(db, maya.id).period.status, 'active');
});

test('vacation APIs isolate member briefings, admin mapping, and CFO access', async t => {
  const db = createDatabase(':memory:');
  const passwordHash = await hashPassword('welcome123');
  seedDemoData(db, { adminPasswordHash: passwordHash, memberPasswordHash: passwordHash, cfoPasswordHash: passwordHash });
  const vacationRunner = {
    async refreshUser(userId) { return vacationPayload(db, userId); },
    async setManualVacation(userId, values) {
      return { ...vacationPayload(db, userId), manual: { enabled: values.enabled } };
    },
  };
  const server = createApp({ db, vacationRunner }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    db.close();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
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
  async function login(email) {
    const response = await request('/api/login', { method: 'POST', body: { email, password: 'welcome123' } });
    assert.equal(response.status, 200);
    return response.cookie;
  }
  const [adminCookie, memberCookie, cfoCookie] = await Promise.all([
    login('admin@lexflow.local'), login('maya@lexflow.local'), login('cfo@lexflow.local'),
  ]);
  const maya = db.prepare("SELECT id FROM users WHERE email = 'maya@lexflow.local'").get();

  assert.equal((await request('/api/vacation', { cookie: memberCookie })).status, 200);
  assert.equal((await request('/api/vacation', { cookie: adminCookie })).status, 403);
  assert.equal((await request('/api/vacation/briefings', { cookie: cfoCookie })).status, 403);
  assert.equal((await request('/api/vacation/manual', {
    method: 'PUT', body: { enabled: true, startsAt: '2026-08-20T09:00:00.000Z', endsAt: '2026-08-21T09:00:00.000Z' }, cookie: memberCookie,
  })).status, 200);
  assert.equal((await request('/api/vacation/manual', {
    method: 'PUT', body: { enabled: false }, cookie: adminCookie,
  })).status, 403);
  assert.equal((await request(`/api/team/${maya.id}/microsoft-principal`, {
    method: 'PATCH', body: { microsoftPrincipal: 'maya@blade.example' }, cookie: memberCookie,
  })).status, 403);
  const mapped = await request(`/api/team/${maya.id}/microsoft-principal`, {
    method: 'PATCH', body: { microsoftPrincipal: 'maya@blade.example' }, cookie: adminCookie,
  });
  assert.equal(mapped.status, 200);
  assert.equal(mapped.body.member.microsoftPrincipal, 'maya@blade.example');
  const cfoBootstrap = await request('/api/bootstrap', { cookie: cfoCookie });
  assert.equal(cfoBootstrap.status, 200);
  assert.equal(cfoBootstrap.body.vacation, undefined);
  assert.equal(cfoBootstrap.body.emails, undefined);
});
