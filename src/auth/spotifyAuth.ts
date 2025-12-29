import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';
import * as readline from 'readline';
import SpotifyWebApi from 'spotify-web-api-node';
import { TokenManager } from './tokenManager';
import { Config, TokenData } from '../types';

export class SpotifyAuth {
  private spotifyApi: SpotifyWebApi;
  private tokenManager: TokenManager;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.spotifyApi = new SpotifyWebApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });
    this.tokenManager = new TokenManager(config.tokenFile);
  }

  async authenticate(): Promise<void> {
    const existingTokens = this.tokenManager.loadTokens();
    
    if (existingTokens && existingTokens.expiresAt > Date.now()) {
      this.spotifyApi.setAccessToken(existingTokens.accessToken);
      this.spotifyApi.setRefreshToken(existingTokens.refreshToken);
      return;
    }

    if (existingTokens?.refreshToken) {
      try {
        await this.refreshAccessToken(existingTokens.refreshToken);
        return;
      } catch (error) {
        console.log('Failed to refresh token, starting new authentication flow...');
      }
    }

    await this.startAuthFlow(false);
  }

  async startAuthFlow(manual: boolean = false): Promise<void> {
    const scopes = [
      'user-read-recently-played',
      'playlist-modify-private',
      'user-read-email',
    ];

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = this.spotifyApi.createAuthorizeURL(scopes, state);

    if (manual) {
      const authCode = await this.waitForManualCallback(authUrl, state);
      await this.exchangeCodeForTokens(authCode);
    } else {
      console.log('Please visit this URL to authorize the application:');
      console.log(authUrl);
      console.log('\nWaiting for authorization...');

      const authCode = await this.waitForCallback(state);
      await this.exchangeCodeForTokens(authCode);
    }
  }

  private waitForManualCallback(authUrl: string, expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log('\n=== Manual Authorization Mode ===');
      console.log('1. Open this URL in your browser:');
      console.log(`\n   ${authUrl}\n`);
      console.log('2. After authorizing, you will be redirected to a URL that looks like:');
      console.log('   http://localhost:3000/callback?code=...&state=...');
      console.log('3. Copy the ENTIRE redirect URL and paste it below:\n');

      rl.question('Paste the redirect URL here: ', (redirectUrl: string) => {
        rl.close();

        try {
          const parsedUrl = url.parse(redirectUrl, true);
          const { code, state, error } = parsedUrl.query;

          if (error) {
            reject(new Error(`Authorization error: ${error}`));
            return;
          }

          if (state !== expectedState) {
            reject(new Error('Invalid state parameter. Please try again.'));
            return;
          }

          if (code && typeof code === 'string') {
            resolve(code);
          } else {
            reject(new Error('Missing authorization code in URL. Please check the URL and try again.'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse redirect URL: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });
  }

  private waitForCallback(expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (!req.url) {
          res.writeHead(400);
          res.end('Invalid request');
          return;
        }

        const parsedUrl = url.parse(req.url, true);
        const { code, state, error } = parsedUrl.query;

        if (error) {
          res.writeHead(400);
          res.end(`Authorization error: ${error}`);
          server.close();
          reject(new Error(`Authorization error: ${error}`));
          return;
        }

        if (state !== expectedState) {
          res.writeHead(400);
          res.end('Invalid state parameter');
          server.close();
          reject(new Error('Invalid state parameter'));
          return;
        }

        if (code && typeof code === 'string') {
          res.writeHead(200);
          res.end('Authorization successful! You can close this window.');
          server.close();
          resolve(code);
        } else {
          res.writeHead(400);
          res.end('Missing authorization code');
          server.close();
          reject(new Error('Missing authorization code'));
        }
      });

      const port = new URL(this.config.redirectUri).port || '3000';
      server.listen(parseInt(port), () => {
        console.log(`Listening on port ${port} for callback...`);
      });

      server.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async exchangeCodeForTokens(code: string): Promise<void> {
    try {
      const data = await this.spotifyApi.authorizationCodeGrant(code);
      const { access_token, refresh_token, expires_in } = data.body;

      const tokenData: TokenData = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000),
      };

      this.tokenManager.saveTokens(tokenData);
      this.spotifyApi.setAccessToken(access_token);
      this.spotifyApi.setRefreshToken(refresh_token);

      console.log('Authentication successful!');
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<void> {
    try {
      this.spotifyApi.setRefreshToken(refreshToken);
      const data = await this.spotifyApi.refreshAccessToken();
      const { access_token, expires_in } = data.body;

      const existingTokens = this.tokenManager.loadTokens();
      if (existingTokens) {
        const tokenData: TokenData = {
          ...existingTokens,
          accessToken: access_token,
          expiresAt: Date.now() + (expires_in * 1000),
        };
        this.tokenManager.saveTokens(tokenData);
      }

      this.spotifyApi.setAccessToken(access_token);
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getApi(): SpotifyWebApi {
    return this.spotifyApi;
  }

  async ensureAuthenticated(): Promise<void> {
    const tokens = this.tokenManager.loadTokens();
    if (!tokens) {
      throw new Error('Not authenticated. Please run authentication first.');
    }

    if (tokens.expiresAt <= Date.now()) {
      await this.refreshAccessToken(tokens.refreshToken);
    } else {
      this.spotifyApi.setAccessToken(tokens.accessToken);
      this.spotifyApi.setRefreshToken(tokens.refreshToken);
    }
  }
}
