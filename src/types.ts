export interface Track {
  id: string;
  name: string;
  artists: string[];
  playedAt: Date;
}

export interface PlaylistInfo {
  id: string;
  name: string;
  url: string;
}

export interface Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenFile?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
