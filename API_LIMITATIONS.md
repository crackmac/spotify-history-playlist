# Spotify API Limitations Investigation

## Known Limitations

### 1. Recently Played Tracks API (`/v1/me/player/recently-played`)

**Documentation**: https://developer.spotify.com/documentation/web-api/reference/get-recently-played

**Key Limitations**:
- **Maximum tracks returned**: 50 tracks per request
- **Time window**: Only returns tracks played within the **last 24 hours**
- **Pagination**: Uses cursor-based pagination with `before` timestamp (Unix timestamp in milliseconds)

**Important Notes**:
- The API does NOT provide access to historical data beyond 24 hours
- This is a Spotify platform limitation, not a licensing issue
- The `played_at` timestamp is returned in **UTC** format

### 2. Current Implementation Issues

#### Timezone Problem ⚠️
- Spotify returns `played_at` in **UTC**
- Our code compares UTC timestamps against **local timezone** boundaries
- This causes tracks to be filtered incorrectly

Example:
- User plays track at 11:00 PM local time (e.g., PST = UTC-8)
- Spotify stores: 7:00 AM UTC next day
- Our code checks: Is 7:00 AM UTC "today" in local timezone?
- Result: Track appears on wrong day or is filtered out

#### Pagination Logic Issue ⚠️
- Current code stops pagination when no tracks match the date filter in a batch
- Should continue paginating until we've checked all available tracks (up to 24 hours)
- The `before` parameter should continue even if current batch has no matches

### 3. Why Only 2 Tracks Were Found

Possible reasons:
1. **Timezone mismatch**: Tracks played yesterday might be stored with UTC timestamps that fall outside the local date boundaries
2. **24-hour window**: If tracks were played more than 24 hours ago, they're not available via this API
3. **Pagination stopped early**: Logic might be stopping before checking all available tracks

## Solutions Needed

### Fix 1: Proper UTC Timezone Handling
- Convert local date boundaries to UTC before filtering
- Or convert Spotify UTC timestamps to local timezone for comparison
- Ensure date comparisons account for timezone differences

### Fix 2: Improve Pagination Logic
- Continue paginating through all available tracks (up to 24 hours)
- Don't stop early if a batch has no matches for the target date
- Only stop when we've gone beyond the 24-hour window or hit the start of the target date

### Fix 3: Add Debug Logging
- Log timestamps in both UTC and local time
- Show how many total tracks were fetched vs. how many matched the date filter
- Display the time range being queried

## Alternative Approaches

If we need historical data beyond 24 hours:
1. **Store tracks daily**: Run a daily cron job to save tracks to a local database
2. **Use Spotify's Web API Playback History**: Not available via public API
3. **Third-party services**: Some services track Spotify history (requires additional setup)

## References

- Spotify Web API Reference: https://developer.spotify.com/documentation/web-api/reference/get-recently-played
- API Rate Limits: https://developer.spotify.com/documentation/web-api/concepts/rate-limits
