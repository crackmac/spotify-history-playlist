import * as fs from 'fs';
import * as path from 'path';
import { TokenData } from '../types';

const DEFAULT_TOKEN_FILE = path.join(process.cwd(), '.spotify-tokens.json');

export class TokenManager {
  private tokenFile: string;

  constructor(tokenFile?: string) {
    this.tokenFile = tokenFile || DEFAULT_TOKEN_FILE;
  }

  saveTokens(tokenData: TokenData): void {
    try {
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokenData, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  loadTokens(): TokenData | null {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        return null;
      }
      const data = fs.readFileSync(this.tokenFile, 'utf8');
      return JSON.parse(data) as TokenData;
    } catch (error) {
      return null;
    }
  }

  deleteTokens(): void {
    try {
      if (fs.existsSync(this.tokenFile)) {
        fs.unlinkSync(this.tokenFile);
      }
    } catch (error) {
      // Ignore errors when deleting
    }
  }

  hasValidTokens(): boolean {
    const tokens = this.loadTokens();
    if (!tokens) {
      return false;
    }
    return tokens.expiresAt > Date.now();
  }
}
