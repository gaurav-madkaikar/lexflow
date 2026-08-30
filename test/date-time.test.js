import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_TIMEZONE,
  formatDateKey,
  formatZonedDate,
  isDateKey,
  localDateKey,
} from '../public/date-time.js';

test('date helpers use an explicit timezone and 12-hour clock', () => {
  assert.equal(DEFAULT_TIMEZONE, 'Asia/Kolkata');
  assert.equal(localDateKey('2026-08-30T20:30:00.000Z', 'Asia/Kolkata'), '2026-08-31');
  assert.match(formatZonedDate('2026-08-30T20:30:00.000Z', {
    timezone: 'Asia/Kolkata', includeDate: false, locale: 'en-US',
  }), /2:00\sAM/);
  assert.match(formatZonedDate('2026-08-30T20:30:00.000Z', {
    timezone: 'America/New_York', includeDate: false, locale: 'en-US',
  }), /4:30\sPM/);
  assert.equal(isDateKey('2026-02-29'), false);
  assert.equal(isDateKey('2026-08-31'), true);
  assert.match(formatDateKey('2026-08-31', { locale: 'en-US' }), /Monday, August 31, 2026/);
});
