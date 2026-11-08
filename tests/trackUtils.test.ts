import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkArray, deduplicateTracks, filterMusicTracks } from '../src/utils/trackUtils';
import { Track } from '../src/types';

const track = (id: string, overrides: Partial<Track> = {}): Track => ({
  id,
  name: `Song ${id}`,
  artists: ['Artist'],
  playedAt: new Date('2026-01-15T12:00:00Z'),
  ...overrides,
});

describe('deduplicateTracks', () => {
  it('keeps the first occurrence of each track id, in order', () => {
    const tracks = [track('a'), track('b'), track('a'), track('c'), track('b')];
    assert.deepEqual(deduplicateTracks(tracks).map(t => t.id), ['a', 'b', 'c']);
  });

  it('keeps the first play time for a repeated track', () => {
    const first = track('a', { playedAt: new Date('2026-01-15T18:00:00Z') });
    const second = track('a', { playedAt: new Date('2026-01-15T09:00:00Z') });
    assert.deepEqual(deduplicateTracks([first, second]), [first]);
  });
});

describe('filterMusicTracks', () => {
  it('drops tracks without an id, name or artists', () => {
    const tracks = [
      track('ok'),
      track(''),
      track('no-name', { name: '' }),
      track('no-artists', { artists: [] }),
    ];
    assert.deepEqual(filterMusicTracks(tracks).map(t => t.id), ['ok']);
  });
});

describe('chunkArray', () => {
  it('splits into chunks of the given size with a shorter last chunk', () => {
    const ids = Array.from({ length: 250 }, (_, i) => i);
    const chunks = chunkArray(ids, 100);
    assert.deepEqual(chunks.map(c => c.length), [100, 100, 50]);
    assert.deepEqual(chunks.flat(), ids);
  });

  it('returns no chunks for an empty array', () => {
    assert.deepEqual(chunkArray([], 100), []);
  });
});
