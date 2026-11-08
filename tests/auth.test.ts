import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SpotifyAuth } from '../src/auth/spotifyAuth';
import { TokenManager } from '../src/auth/tokenManager';
import { TokenData } from '../src/types';

const posixOnly = { skip: process.platform === 'win32' ? 'file modes are POSIX-only' : false };

describe('token storage', () => {
  let dir: string;
  let tokenFile: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shp-auth-'));
    tokenFile = path.join(dir, '.spotify-tokens.json');
    mock.method(console, 'log', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const tokens = (overrides: Partial<TokenData> = {}): TokenData => ({
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: Date.now() - 1000,
    ...overrides,
  });

  it('round-trips saved tokens', () => {
    const manager = new TokenManager(tokenFile);
    manager.saveTokens(tokens());
    assert.deepEqual(manager.loadTokens(), tokens({ expiresAt: manager.loadTokens()!.expiresAt }));
  });

  it('writes the token file readable by the owner only', posixOnly, () => {
    new TokenManager(tokenFile).saveTokens(tokens());
    assert.equal(fs.statSync(tokenFile).mode & 0o777, 0o600);
  });

  it('tightens permissions on an existing world-readable token file', posixOnly, () => {
    fs.writeFileSync(tokenFile, '{}', { mode: 0o644 });
    fs.chmodSync(tokenFile, 0o644);
    new TokenManager(tokenFile).saveTokens(tokens());
    assert.equal(fs.statSync(tokenFile).mode & 0o777, 0o600);
  });

  function authWithMockApi(refreshBody: Record<string, unknown>) {
    const auth = new SpotifyAuth({
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'http://127.0.0.1:3000/callback',
      tokenFile,
    });
    const api = {
      setAccessToken: mock.fn(),
      setRefreshToken: mock.fn(),
      refreshAccessToken: mock.fn(async () => ({ body: refreshBody })),
    };
    (auth as any).spotifyApi = api;
    return { auth, api };
  }

  it('stores a rotated refresh token returned by a refresh', async () => {
    new TokenManager(tokenFile).saveTokens(tokens());
    const { auth, api } = authWithMockApi({
      access_token: 'access-2',
      refresh_token: 'refresh-2',
      expires_in: 3600,
    });

    await auth.ensureAuthenticated();

    const saved = new TokenManager(tokenFile).loadTokens()!;
    assert.equal(saved.accessToken, 'access-2');
    assert.equal(saved.refreshToken, 'refresh-2');
    assert.ok(saved.expiresAt > Date.now());
    assert.deepEqual(api.setRefreshToken.mock.calls[api.setRefreshToken.mock.calls.length - 1].arguments, ['refresh-2']);
  });

  it('keeps the existing refresh token when none is returned', async () => {
    new TokenManager(tokenFile).saveTokens(tokens());
    const { auth } = authWithMockApi({ access_token: 'access-2', expires_in: 3600 });

    await auth.ensureAuthenticated();

    const saved = new TokenManager(tokenFile).loadTokens()!;
    assert.equal(saved.accessToken, 'access-2');
    assert.equal(saved.refreshToken, 'refresh-1');
  });
});
