#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { SpotifyAuth } from './auth/spotifyAuth';
import { HistoryFetcher } from './api/historyFetcher';
import { PlaylistManager } from './playlist/playlistManager';
import { deduplicateTracks } from './utils/trackUtils';
import { parseDate, formatDate } from './utils/dateUtils';
import { Config } from './types';

dotenv.config();

const program = new Command();

program
  .name('spotify-history-playlist')
  .description('Create Spotify playlists from listening history')
  .version('1.0.0');

program
  .command('auth')
  .description('Authenticate with Spotify')
  .option('--manual', 'Use manual copy-paste flow (no redirect URI needed)', false)
  .action(async (options) => {
    try {
      const config = loadConfig();
      const auth = new SpotifyAuth(config);
      
      if (options.manual) {
        await auth.startAuthFlow(true);
      } else {
        await auth.authenticate();
      }
      
      console.log('Authentication complete!');
    } catch (error) {
      console.error('Authentication failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

const listTracksCommand = program
  .command('list-tracks')
  .alias('list')
  .description('List tracks from listening history (default command)')
  .option('--date <date>', 'Use a specific date (YYYY-MM-DD). Default: today')
  .option('--all', 'Show all tracks including duplicates. Default: show only unique tracks', false)
  .action(async (options) => {
    try {
      const config = loadConfig();
      const auth = new SpotifyAuth(config);
      await auth.ensureAuthenticated();

      const spotifyApi = auth.getApi();
      const historyFetcher = new HistoryFetcher(spotifyApi);

      const targetDate = options.date ? parseDate(options.date) : undefined;
      const dateLabel = targetDate ? formatDate(targetDate) : 'today';

      console.log(`Fetching listening history for ${dateLabel}...`);
      const tracks = await historyFetcher.getTodaysTracks(targetDate);

      if (tracks.length === 0) {
        console.log(`No tracks found for ${dateLabel}.`);
        return;
      }

      const displayTracks = options.all ? tracks : deduplicateTracks(tracks);
      const trackLabel = options.all ? 'track(s)' : 'unique track(s)';
      console.log(`\nFound ${displayTracks.length} ${trackLabel} for ${dateLabel}:\n`);

      displayTracks.forEach((track, index) => {
        const timeStr = track.playedAt.toLocaleTimeString();
        console.log(`  ${index + 1}. ${track.name} - ${track.artists.join(', ')} (${timeStr})`);
      });
    } catch (error) {
      console.error('Failed to list tracks:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('create-playlist')
  .alias('create')
  .description('Create a playlist from listening history')
  .option('--dry-run', 'Preview what would happen without creating the playlist', false)
  .option('--date <date>', 'Use a specific date (YYYY-MM-DD). Default: today')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const auth = new SpotifyAuth(config);
      await auth.ensureAuthenticated();

      const spotifyApi = auth.getApi();
      const historyFetcher = new HistoryFetcher(spotifyApi);
      const playlistManager = new PlaylistManager(spotifyApi);

      const targetDate = options.date ? parseDate(options.date) : undefined;
      const dateLabel = targetDate ? formatDate(targetDate) : 'today';

      console.log(`Fetching listening history for ${dateLabel}...`);
      const tracks = await historyFetcher.getTodaysTracks(targetDate);

      if (tracks.length === 0) {
        console.log(`No tracks found for ${dateLabel}.`);
        return;
      }

      const uniqueTracks = deduplicateTracks(tracks);
      console.log(`Found ${uniqueTracks.length} unique track(s) for ${dateLabel}.`);

      const playlistName = playlistManager.generatePlaylistName(targetDate);

      if (options.dryRun) {
        console.log('\n=== DRY RUN MODE ===');
        console.log(`Would create playlist: ${playlistName}`);
        console.log('Would add tracks:');
        uniqueTracks.forEach((track, index) => {
          console.log(`  ${index + 1}. ${track.name} - ${track.artists.join(', ')}`);
        });
        return;
      }

      console.log(`Creating playlist: ${playlistName}`);
      
      const playlist = await playlistManager.createPlaylist(
        playlistName,
        `Automatically created playlist with ${uniqueTracks.length} track(s) from ${dateLabel}'s listening history.`,
        false
      );

      console.log(`Playlist created: ${playlist.url}`);
      console.log(`Adding ${uniqueTracks.length} track(s)...`);

      const trackIds = uniqueTracks.map(track => track.id);
      await playlistManager.addTracksToPlaylist(playlist.id, trackIds);

      console.log('Done!');
      console.log(`Playlist URL: ${playlist.url}`);
    } catch (error) {
      console.error('Failed to create playlist:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

function loadConfig(): Config {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing required environment variables. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.\n' +
      'See README.md for setup instructions.'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

const args = process.argv.slice(2);

if (args.length === 0 || (args.length === 1 && (args[0] === '--help' || args[0] === '-h'))) {
  if (args.length === 0) {
    const listCommand = program.commands.find(cmd => cmd.name() === 'list-tracks');
    if (listCommand) {
      listCommand.parseAsync(['list-tracks']).catch((error) => {
        console.error('Error:', error.message);
        process.exit(1);
      });
    } else {
      program.parse();
    }
  } else {
    program.parse();
  }
} else {
  program.parse();
}
