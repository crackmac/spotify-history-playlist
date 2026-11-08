// Pin a non-UTC timezone so local-vs-UTC handling is exercised the same way
// on every machine (CI runners are usually UTC, which hides offset bugs).
process.env.TZ = 'America/Los_Angeles';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, getDateBoundaries, isDate, parseDate } from '../src/utils/dateUtils';

describe('parseDate', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const date = parseDate('2026-01-15');
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 0);
    assert.equal(date.getDate(), 15);
    assert.equal(date.getHours(), 0);
  });

  for (const input of ['2026/01/15', '20260115', 'yesterday', '2026-01', 'aa-bb-cc']) {
    it(`rejects ${input}`, () => {
      assert.throws(() => parseDate(input), /Invalid date/);
    });
  }
});

describe('formatDate', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    assert.equal(formatDate(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  });

  it('round-trips with parseDate', () => {
    assert.equal(formatDate(parseDate('2026-12-31')), '2026-12-31');
  });
});

describe('getDateBoundaries / isDate', () => {
  it('spans local midnight to the last millisecond of the local day', () => {
    const { start, end } = getDateBoundaries(new Date(2026, 0, 15, 13, 45));
    assert.deepEqual(start, new Date(2026, 0, 15, 0, 0, 0, 0));
    assert.deepEqual(end, new Date(2026, 0, 15, 23, 59, 59, 999));
  });

  it('includes both ends of the day and excludes the next day', () => {
    const day = new Date(2026, 0, 15);
    assert.equal(isDate(new Date(2026, 0, 15, 0, 0, 0, 0), day), true);
    assert.equal(isDate(new Date(2026, 0, 15, 23, 59, 59, 999), day), true);
    assert.equal(isDate(new Date(2026, 0, 16, 0, 0, 0, 0), day), false);
  });
});
