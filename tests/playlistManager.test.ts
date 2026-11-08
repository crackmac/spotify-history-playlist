import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import SpotifyWebApi from 'spotify-web-api-node';
import { PlaylistManager } from '../src/playlist/playlistManager';

function rateLimitError(retryAfter?: string) {
  return Object.assign(new Error('Too Many Requests'), {
    statusCode: 429,
    headers: retryAfter ? { 'retry-after': retryAfter } : {},
  });
}

describe('PlaylistManager', () => {
  let addTracks: ReturnType<typeof mock.fn>;
  let createPlaylist: ReturnType<typeof mock.fn>;
  let manager: PlaylistManager;
  let delays: number[];

  beforeEach(() => {
    addTracks = mock.fn(async () => ({}));
    createPlaylist = mock.fn();
    const api = { addTracksToPlaylist: addTracks, createPlaylist };
    manager = new PlaylistManager(api as unknown as SpotifyWebApi);
    // Record, but skip, waits between requests and during rate-limit back-off.
    delays = [];
    (manager as any).delay = async (ms: number) => {
      delays.push(ms);
    };
    mock.method(console, 'log', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const batches = () => addTracks.mock.calls.map(call => call.arguments[1] as string[]);

  it('adds tracks as spotify:track URIs in batches of 100', async () => {
    const ids = Array.from({ length: 205 }, (_, i) => `id${i}`);
    await manager.addTracksToPlaylist('pl1', ids);

    assert.deepEqual(batches().map(b => b.length), [100, 100, 5]);
    assert.equal(batches()[0][0], 'spotify:track:id0');
    assert.deepEqual(batches().flat(), ids.map(id => `spotify:track:${id}`));
  });

  it('retries a rate-limited batch after Retry-After seconds without skipping it', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id${i}`);
    addTracks.mock.mockImplementationOnce(async () => {
      throw rateLimitError('7');
    }, 1);

    await manager.addTracksToPlaylist('pl1', ids);

    assert.equal(addTracks.mock.callCount(), 3);
    assert.deepEqual(batches()[1], batches()[2]);
    assert.ok(delays.includes(7000), `expected a 7000ms back-off, got ${delays}`);
  });

  it('wraps non-rate-limit errors', async () => {
    addTracks.mock.mockImplementation(async () => {
      throw new Error('Forbidden');
    });
    await assert.rejects(manager.addTracksToPlaylist('pl1', ['a']), {
      message: 'Failed to add tracks to playlist: Forbidden',
    });
  });

  it('creates a private playlist and returns its id, name and url', async () => {
    createPlaylist.mock.mockImplementation(async () => ({
      body: { id: 'pl1', name: 'My list', external_urls: { spotify: 'https://open.spotify.com/playlist/pl1' } },
    }));
    const info = await manager.createPlaylist('My list', 'desc');
    assert.deepEqual(createPlaylist.mock.calls[0].arguments, ['My list', { description: 'desc', public: false }]);
    assert.deepEqual(info, { id: 'pl1', name: 'My list', url: 'https://open.spotify.com/playlist/pl1' });
  });

  it('names playlists after the target date', () => {
    assert.equal(manager.generatePlaylistName(new Date(2026, 0, 15)), "Today's History - 2026-01-15");
  });
});
