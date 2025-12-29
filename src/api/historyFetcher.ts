import SpotifyWebApi from 'spotify-web-api-node';
import { Track } from '../types';
import { isToday, isDate, getDateBoundaries } from '../utils/dateUtils';
import { filterMusicTracks } from '../utils/trackUtils';

export class HistoryFetcher {
  private spotifyApi: SpotifyWebApi;

  constructor(spotifyApi: SpotifyWebApi) {
    this.spotifyApi = spotifyApi;
  }

  async getTodaysTracks(targetDate?: Date): Promise<Track[]> {
    const allTracks: Track[] = [];
    let before: number | undefined = undefined;
    let hasMore = true;
    const filterDate = targetDate || new Date();
    const { start: dateStart } = getDateBoundaries(filterDate);

    while (hasMore) {
      try {
        const response = await this.spotifyApi.getMyRecentlyPlayedTracks({
          limit: 50,
          before: before,
        });

        const items = response.body.items || [];
        
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        const tracks = items
          .map((item: any) => {
            if (!item.track || item.track.type !== 'track') {
              return null;
            }

            const playedAt = new Date(item.played_at);
            
            return {
              id: item.track.id,
              name: item.track.name,
              artists: item.track.artists.map((artist: any) => artist.name),
              playedAt: playedAt,
            } as Track;
          })
          .filter((track: Track | null): track is Track => track !== null);

        const filteredTracks = targetDate 
          ? tracks.filter((track: Track) => isDate(track.playedAt, filterDate))
          : tracks.filter((track: Track) => isToday(track.playedAt));
        
        if (filteredTracks.length === 0) {
          const oldestTrack = tracks[tracks.length - 1];
          if (oldestTrack && oldestTrack.playedAt < dateStart) {
            hasMore = false;
            break;
          }
        }

        allTracks.push(...filteredTracks);

        if (tracks.length < 50) {
          hasMore = false;
        } else {
          const lastTrack = tracks[tracks.length - 1];
          const isLastTrackInDate = targetDate 
            ? isDate(lastTrack.playedAt, filterDate)
            : isToday(lastTrack.playedAt);
          
          if (!isLastTrackInDate && lastTrack.playedAt < dateStart) {
            hasMore = false;
          } else {
            before = Math.floor(lastTrack.playedAt.getTime());
          }
        }

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

    return filterMusicTracks(allTracks);
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
