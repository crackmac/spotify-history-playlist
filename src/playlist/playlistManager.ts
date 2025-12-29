import SpotifyWebApi from 'spotify-web-api-node';
import { PlaylistInfo } from '../types';
import { formatDate } from '../utils/dateUtils';
import { chunkArray } from '../utils/trackUtils';

export class PlaylistManager {
  private spotifyApi: SpotifyWebApi;

  constructor(spotifyApi: SpotifyWebApi) {
    this.spotifyApi = spotifyApi;
  }

  async createPlaylist(name: string, description?: string, isPublic: boolean = false): Promise<PlaylistInfo> {
    try {
      const playlist = await this.spotifyApi.createPlaylist(name, {
        description: description || `Playlist created on ${formatDate(new Date())}`,
        public: isPublic,
      });

      const playlistData = playlist.body as any;

      return {
        id: playlistData.id,
        name: playlistData.name,
        url: playlistData.external_urls.spotify,
      };
    } catch (error) {
      throw new Error(`Failed to create playlist: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    const chunks = chunkArray(trackIds, 100);
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        await this.spotifyApi.addTracksToPlaylist(playlistId, chunks[i].map(id => `spotify:track:${id}`));
        
        if (chunks.length > 1) {
          console.log(`Added batch ${i + 1}/${chunks.length} (${chunks[i].length} tracks)`);
        }

        if (i < chunks.length - 1) {
          await this.delay(100);
        }
      } catch (error) {
        if (this.isRateLimitError(error)) {
          const retryAfter = this.getRetryAfter(error);
          console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
          await this.delay(retryAfter * 1000);
          i--;
          continue;
        }
        throw new Error(`Failed to add tracks to playlist: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<string[]> {
    const trackIds: string[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      try {
        const response = await this.spotifyApi.getPlaylistTracks(playlistId, {
          offset: offset,
          limit: limit,
        });

        const items = response.body.items || [];
        
        if (items.length === 0) {
          break;
        }

        for (const item of items) {
          if (item.track && 'id' in item.track && item.track.id) {
            trackIds.push(item.track.id);
          }
        }

        if (items.length < limit) {
          break;
        }

        offset += limit;
        await this.delay(100);
      } catch (error) {
        if (this.isRateLimitError(error)) {
          const retryAfter = this.getRetryAfter(error);
          console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
          await this.delay(retryAfter * 1000);
          continue;
        }
        throw error;
      }
    }

    return trackIds;
  }

  generatePlaylistName(targetDate?: Date): string {
    const date = targetDate || new Date();
    return `Today's History - ${formatDate(date)}`;
  }

  private isRateLimitError(error: any): boolean {
    return error?.statusCode === 429 || error?.body?.error?.status === 429;
  }

  private getRetryAfter(error: any): number {
    const retryAfter = error?.headers?.['retry-after'];
    return retryAfter ? parseInt(retryAfter, 10) : 5;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
