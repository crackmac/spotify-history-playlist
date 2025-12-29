import { Track } from '../types';

export function deduplicateTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const unique: Track[] = [];
  
  for (const track of tracks) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      unique.push(track);
    }
  }
  
  return unique;
}

export function filterMusicTracks(tracks: Track[]): Track[] {
  return tracks.filter(track => {
    return track.id && track.name && track.artists.length > 0;
  });
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
