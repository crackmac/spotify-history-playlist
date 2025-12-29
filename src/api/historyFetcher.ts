import SpotifyWebApi from 'spotify-web-api-node';
import { Track } from '../types';
import { isToday, isDate, getDateBoundaries, isDateUTC, getDateBoundariesUTC } from '../utils/dateUtils';
import { filterMusicTracks } from '../utils/trackUtils';

export class HistoryFetcher {
  private spotifyApi: SpotifyWebApi;

  constructor(spotifyApi: SpotifyWebApi) {
    this.spotifyApi = spotifyApi;
  }

  async getTodaysTracks(targetDate?: Date, debug: boolean = false): Promise<Track[]> {
    const allTracks: Track[] = [];
    let before: number | undefined = undefined;
    let hasMore = true;
    const filterDate = targetDate || new Date();
    const { startUTC, endUTC } = getDateBoundariesUTC(filterDate);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let totalFetched = 0;

    if (debug) {
      console.log(`\n[DEBUG] Filtering for date: ${filterDate.toLocaleDateString()}`);
      console.log(`[DEBUG] Local date boundaries: ${getDateBoundaries(filterDate).start.toLocaleString()} to ${getDateBoundaries(filterDate).end.toLocaleString()}`);
      console.log(`[DEBUG] UTC date boundaries: ${startUTC.toISOString()} to ${endUTC.toISOString()}`);
      console.log(`[DEBUG] 24-hour window starts at: ${twentyFourHoursAgo.toISOString()}\n`);
    }

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

        totalFetched += tracks.length;

        const filteredTracks = targetDate 
          ? tracks.filter((track: Track) => isDateUTC(track.playedAt, filterDate))
          : tracks.filter((track: Track) => isDateUTC(track.playedAt, new Date()));
        
        allTracks.push(...filteredTracks);

        if (debug && tracks.length > 0) {
          const oldestTrack = tracks[tracks.length - 1];
          const newestTrack = tracks[0];
          console.log(`[DEBUG] Batch: ${tracks.length} tracks fetched, ${filteredTracks.length} matched date filter`);
          console.log(`[DEBUG]   Oldest: ${oldestTrack.name} at ${oldestTrack.playedAt.toISOString()} (${oldestTrack.playedAt.toLocaleString()})`);
          console.log(`[DEBUG]   Newest: ${newestTrack.name} at ${newestTrack.playedAt.toISOString()} (${newestTrack.playedAt.toLocaleString()})`);
        }

        if (tracks.length < 50) {
          hasMore = false;
        } else {
          const lastTrack = tracks[tracks.length - 1];
          const lastTrackTime = lastTrack.playedAt.getTime();
          
          if (lastTrackTime < startUTC.getTime()) {
            hasMore = false;
            if (debug) {
              console.log(`[DEBUG] Stopping: oldest track (${lastTrack.playedAt.toISOString()}) is before target date start (${startUTC.toISOString()})`);
            }
          } else if (lastTrackTime < twentyFourHoursAgo.getTime()) {
            hasMore = false;
            if (debug) {
              console.log(`[DEBUG] Stopping: oldest track (${lastTrack.playedAt.toISOString()}) is beyond 24-hour window`);
            }
          } else {
            before = Math.floor(lastTrackTime);
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

    if (debug) {
      console.log(`\n[DEBUG] Total tracks fetched: ${totalFetched}`);
      console.log(`[DEBUG] Total tracks matching date filter: ${allTracks.length}`);
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
