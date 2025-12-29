# Spotify History Playlist Creator

A CLI tool that automatically creates Spotify playlists from today's listening history.

## Features

- ✅ Fetches today's listening history (midnight-to-now in your timezone)
- ✅ Creates a new playlist per day with format: "Today's History - YYYY-MM-DD"
- ✅ Deduplicates tracks (each track appears once)
- ✅ Filters to music tracks only (excludes podcasts)
- ✅ Private playlists by default
- ✅ Dry-run mode to preview changes
- ✅ Automatic token refresh
- ✅ Rate limit handling

## Prerequisites

- Node.js 18+ and npm
- A Spotify account
- A Spotify Developer Application (see Setup below)

## Setup

### 1. Create a Spotify Developer Application

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create an app"
4. Fill in:
   - App name: `Spotify History Playlist` (or any name)
   - App description: `CLI tool to create playlists from listening history`
   - Redirect URI: **`http://127.0.0.1:3000/callback`**
     - ⚠️ **Important**: Spotify does NOT allow `localhost`. You MUST use `127.0.0.1` (IPv4) or `[::1]` (IPv6)
     - For manual flow, you can use any valid URI since it's not used
   - Category: `Other`
5. Click "Save"
6. Note your **Client ID** and **Client Secret**

**Spotify Redirect URI Requirements:**
- ✅ Use `http://127.0.0.1:PORT` for local development (IPv4 loopback)
- ✅ Use `http://[::1]:PORT` for IPv6 loopback
- ✅ Use HTTPS for production URLs
- ❌ `localhost` is NOT allowed

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
```

### 4. Build the Project

```bash
npm run build
```

## Usage

### Authenticate

First, authenticate with Spotify. You have two options:

#### Automatic Flow (requires redirect URI setup)

```bash
npm run dev auth
# or after building:
npm start auth
```

This will:
1. Show you an authorization URL
2. Open it in your browser (or you can copy/paste it)
3. After authorization, automatically capture the callback
4. Save your tokens for future use

#### Manual Flow (no redirect URI needed)

If you're having issues with the redirect URI, use manual mode:

```bash
npm run dev auth -- --manual
# or after building:
npm start auth -- --manual
```

This will:
1. Show you an authorization URL
2. You copy and open it in your browser
3. After authorization, copy the entire redirect URL from your browser
4. Paste it back into the terminal
5. Save your tokens for future use

### List Tracks (Default Command)

List tracks from your listening history. This is the default command when no command is specified:

```bash
npm run dev
# or explicitly:
npm run dev list-tracks
# or after building:
npm start list-tracks
```

List tracks for a specific date:

```bash
npm run dev list-tracks -- --date 2024-01-15
```

### Create Playlist

Create a playlist from listening history:

```bash
npm run dev create-playlist
# or after building:
npm start create-playlist
```

Create playlist for a specific date:

```bash
npm run dev create-playlist -- --date 2024-01-15
```

### Dry Run Mode

Preview what would happen without creating the playlist:

```bash
npm run dev create-playlist -- --dry-run
```

## Commands

- `list-tracks` (or `list`) - List tracks from listening history (default command)
  - `--date <YYYY-MM-DD>` - Use a specific date. Default: today
  - `--all` - Show all tracks including duplicates. Default: show only unique tracks
- `create-playlist` (or `create`) - Create a playlist from listening history
  - `--dry-run` - Preview changes without creating playlist
  - `--date <YYYY-MM-DD>` - Use a specific date. Default: today
- `auth` - Authenticate with Spotify
  - `--manual` - Use manual copy-paste flow (no redirect URI needed)

### Examples

```bash
# List today's tracks (default)
npm run dev

# List tracks for a specific date
npm run dev list-tracks -- --date 2024-01-15

# List all tracks including duplicates
npm run dev list-tracks -- --all

# List all tracks for a specific date
npm run dev list-tracks -- --date 2024-01-15 --all

# Create playlist for today
npm run dev create-playlist

# Preview playlist creation (dry run)
npm run dev create-playlist -- --dry-run

# Create playlist for a specific date
npm run dev create-playlist -- --date 2024-01-15
```

## How It Works

1. **Authentication**: Uses OAuth 2.0 with Authorization Code flow. Tokens are stored locally in `.spotify-tokens.json`
2. **History Fetching**: Fetches recently played tracks from Spotify API and filters to today (midnight-to-now in your timezone)
3. **Filtering**: Filters to music tracks only (excludes podcasts/episodes)
4. **Deduplication**: Removes duplicate tracks (if you played the same song multiple times)
5. **Playlist Creation**: Creates a new private playlist named "Today's History - YYYY-MM-DD"
6. **Track Addition**: Adds all unique tracks to the playlist in batches

## Troubleshooting

### Authentication Issues

- **Redirect URI errors**: 
  - ⚠️ **Spotify does NOT allow `localhost`**. You MUST use `http://127.0.0.1:3000/callback` (IPv4) or `http://[::1]:3000/callback` (IPv6)
  - Make sure your redirect URI in `.env` matches exactly what's configured in Spotify Developer Dashboard
  - Or use manual authentication mode: `npm run dev auth -- --manual` (redirect URI not used in manual mode)
- If authentication fails, delete `.spotify-tokens.json` and try again
- Ensure port 3000 is available (or change `SPOTIFY_REDIRECT_URI`) - only needed for automatic flow

### No Tracks Found

- Make sure you've actually played music on Spotify today
- Check your timezone settings
- Spotify's "recently played" API may have limitations on how far back it goes

### Rate Limiting

The tool automatically handles rate limits with exponential backoff. If you hit rate limits frequently, wait a few minutes between runs.

## Development

```bash
# Development mode (TypeScript with ts-node)
npm run dev create

# Build TypeScript
npm run build

# Run compiled JavaScript
npm start create
```

## Project Structure

```
src/
  auth/          # Authentication modules
  api/           # Spotify API integration
  playlist/      # Playlist management
  utils/         # Utility functions
  cli.ts         # CLI entry point
  types.ts       # TypeScript type definitions
```

## License

ISC
