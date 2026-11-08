// Pacific time: local midnight is 08:00Z in winter.
process.env.TZ = 'America/Los_Angeles';

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import SpotifyWebApi from 'spotify-web-api-node';
import { HistoryFetcher } from '../src/api/historyFetcher';
import { getDateBoundariesUTC, isDateUTC } from '../src/utils/dateUtils';

const JAN_15 = new Date(2026, 0, 15); // local midnight, 2026-01-15T08:00:00Z

describe('getDateBoundariesUTC', () => {
  it('returns the instants of local midnight and local end of day', () => {
    const { startUTC, endUTC } = getDateBoundariesUTC(JAN_15);
    assert.equal(startUTC.toISOString(), '2026-01-15T08:00:00.000Z');
    assert.equal(endUTC.toISOString(), '2026-01-16T07:59:59.999Z');
  });

  it('follows DST: a summer day starts at 07:00Z', () => {
    const { startUTC } = getDateBoundariesUTC(new Date(2026, 6, 4));
    assert.equal(startUTC.toISOString(), '2026-07-04T07:00:00.000Z');
  });
});

describe('isDateUTC', () => {
  it('counts plays between local midnight and 8am as that day', () => {
    assert.equal(isDateUTC(new Date('2026-01-15T09:30:00Z'), JAN_15), true); // 01:30 local
  });

  it('counts a late-evening play as that day', () => {
    assert.equal(isDateUTC(new Date('2026-01-16T07:30:00Z'), JAN_15), true); // 23:30 local
  });

  it('does not count plays from the next local morning', () => {
    assert.equal(isDateUTC(new Date('2026-01-16T09:00:00Z'), JAN_15), false); // 01:00 Jan 16 local
  });
});

describe('HistoryFetcher.getTodaysTracks', () => {
  let getRecent: ReturnType<typeof mock.fn>;
  let fetcher: HistoryFetcher;

  const item = (id: string, playedAt: string) => ({
    played_at: playedAt,
    track: { id, name: `Song ${id}`, type: 'track', artists: [{ name: 'Artist' }] },
  });

  beforeEach(() => {
    getRecent = mock.fn(async () => ({
      body: {
        items: [
          item('next-morning', '2026-01-16T09:00:00Z'), // 01:00 Jan 16 local
          item('late-night', '2026-01-16T07:30:00Z'), //    23:30 Jan 15 local
          item('afternoon', '2026-01-15T22:00:00Z'), //     14:00 Jan 15 local
          item('early-morning', '2026-01-15T09:30:00Z'), // 01:30 Jan 15 local
          item('day-before', '2026-01-15T07:00:00Z'), //    23:00 Jan 14 local
        ],
      },
    }));
    fetcher = new HistoryFetcher({ getMyRecentlyPlayedTracks: getRecent } as unknown as SpotifyWebApi);
    (fetcher as any).delay = async () => {};
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('returns exactly the tracks played on the local calendar day', async () => {
    const tracks = await fetcher.getTodaysTracks(JAN_15);
    assert.deepEqual(tracks.map(t => t.id), ['late-night', 'afternoon', 'early-morning']);
  });
});
