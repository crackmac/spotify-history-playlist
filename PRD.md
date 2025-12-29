# Product Requirements Document: Spotify History Playlist Creator

## Overview
A utility that automatically creates a Spotify playlist containing all tracks from today's listening history.

## Goals
- Automatically capture today's listening history from Spotify
- Create a new playlist (or update existing) with those tracks
- Provide a simple, reliable way to preserve daily listening habits

## User Stories
1. As a user, I want to run a command/script that creates a playlist of today's listening history
2. As a user, I want the playlist to be automatically named with today's date
3. As a user, I want to avoid duplicate tracks in the playlist
4. As a user, I want to authenticate securely with Spotify

## Technical Requirements

### Authentication
- Use Spotify OAuth 2.0 flow
- Store refresh tokens securely (environment variables or secure storage)
- Handle token refresh automatically

### Data Sources
- Fetch "Recently Played" tracks from Spotify Web API
- Filter to tracks played from midnight-to-now in user's current timezone
- Filter to music tracks only (exclude podcasts/episodes)
- Handle rate limiting and API errors gracefully

### Playlist Management
- Create new playlist per day with descriptive name (e.g., "Today's History - YYYY-MM-DD")
- Add tracks to playlist (always create new, never update existing)
- Remove duplicates before adding (each track appears once)
- Playlists are private by default

### Error Handling
- Handle API rate limits
- Handle network errors
- Handle authentication failures
- Provide clear error messages

## Step-by-Step Implementation Tasks

### Phase 1: Project Setup & Authentication
1. **Initialize project structure**
   - Choose technology stack (Node.js/Python recommended)
   - Set up package management (npm/pip)
   - Create project directory structure
   - Initialize git repository

2. **Set up Spotify Developer Application**
   - Create Spotify app in Spotify Developer Dashboard
   - Obtain Client ID and Client Secret
   - Configure redirect URI
   - Document required scopes

3. **Implement OAuth 2.0 Authentication**
   - Set up OAuth flow (Authorization Code with PKCE recommended)
   - Create authentication module
   - Implement token storage (environment variables or secure file)
   - Implement token refresh logic
   - Create authentication CLI/script

### Phase 2: Data Fetching
4. **Implement Recently Played API Integration**
   - Create module to fetch recently played tracks
   - Handle pagination for history retrieval
   - Filter tracks to "today" based on timestamp
   - Handle timezone considerations
   - Parse and structure track data (track ID, name, artist)

5. **Implement Date Filtering Logic**
   - Determine "today" boundaries (start/end of day)
   - Filter tracks by played_at timestamp
   - Handle edge cases (midnight, timezone changes)

### Phase 3: Playlist Management
6. **Implement Playlist Creation**
   - Create function to create new playlist
   - Generate playlist name with date
   - Set playlist description
   - Handle playlist creation errors

7. **Implement Track Addition**
   - Batch add tracks to playlist (Spotify allows up to 100 per request)
   - Handle duplicate detection
   - Implement retry logic for failed additions
   - Track success/failure rates

8. **Implement Playlist Creation Logic**
   - Always create new playlist (never update existing)
   - If playlist with today's name exists, create with timestamp suffix or skip
   - Handle duplicate playlist name conflicts

### Phase 4: CLI/Interface
9. **Create Command-Line Interface**
   - Design CLI command structure
   - Implement command parsing
   - Add help/usage documentation
   - Add verbose/quiet modes

10. **Add Configuration Management**
    - Support configuration file (optional)
    - Environment variable support
    - Default settings management

### Phase 5: Error Handling & Edge Cases
11. **Implement Comprehensive Error Handling**
    - API error handling (401, 403, 429, 500)
    - Network timeout handling
    - Invalid token handling
    - Rate limit handling with backoff

12. **Handle Edge Cases**
    - Empty history (no tracks today)
    - Very large history (>100 tracks)
    - Duplicate tracks in history
    - Private/deleted tracks
    - Unavailable tracks in user's region

### Phase 6: Testing & Documentation
13. **Write Tests**
    - Unit tests for core functions
    - Integration tests for API calls (with mocks)
    - Test authentication flow
    - Test edge cases

14. **Create Documentation**
    - README with setup instructions
    - Authentication guide
    - Usage examples
    - Troubleshooting guide
    - API documentation

### Phase 7: Deployment & Automation (Optional)
15. **Add Scheduling Support (Optional)**
    - Cron job setup instructions
    - Scheduled execution capability
    - Notification on completion/failure

16. **Package for Distribution (Optional)**
    - Create installable package
    - Add to package managers (npm/pip)
    - Create release process

## Decisions Made

### Functionality & Behavior
1. **"Today's history" definition:** ✅ Midnight-to-now in current timezone
2. **Playlist management strategy:** ✅ Create new playlist per day (e.g., "Today's History - 2024-01-15")
3. **Duplicate handling:** ✅ Include each track once only (deduplicate)
4. **Playlist visibility:** ✅ Private playlists

### Technical Preferences
5. **Technology stack:** ✅ Node.js/TypeScript (chosen for CLI-first with easy Electron conversion)
6. **Execution model:** ✅ CLI tool with potential for desktop app conversion
7. **Authentication method:** ✅ OAuth Authorization Code flow (easiest to get started)

### User Experience
8. **Output and feedback:** ✅ Print progress/logs, show track count and playlist link
9. **Error recovery:** ✅ Start over on error, include dry-run mode
10. **History scope:** ✅ Only music tracks (exclude podcasts/episodes)

### Advanced Features (Future Considerations)
11. **Future enhancements:** Playlist description with stats, export formats, integration with other services, playlist cover art generation

## Success Criteria
- Successfully authenticate with Spotify
- Fetch all tracks from today's listening history
- Create/update playlist with all tracks
- Handle errors gracefully
- Complete execution in reasonable time (< 30 seconds for typical use)
- Provide clear feedback to user

## Risks & Mitigations
- **API Rate Limits**: Implement exponential backoff and request batching
- **Token Expiration**: Automatic token refresh mechanism
- **Large History**: Pagination and batch processing
- **Network Failures**: Retry logic with exponential backoff
- **Timezone Issues**: Clear timezone handling and documentation

## Dependencies
- Spotify Web API access
- OAuth 2.0 library
- HTTP client library
- Date/time handling library
- Configuration management library
