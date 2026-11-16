# Active Context — Hôm Nay Xem Gì (24h Live Feed & Notification Engine)

## Current State
- The 24h Live Feed and Notification Engine are fully implemented, verified, and running live on `http://localhost:8080/`.
- **Feature 1: 24h Live Update Newfeed**:
  - Tab `⚡ Mới Cập Nhật 24h (32)` filters and shows recent updates sorted by delta timestamp.
  - Cards feature a glowing pill `⚡ [X phút/giờ trước]` on the thumbnail.
- **Feature 2: Notification & Watchlist Tracker**:
  - Header Bell `🔔` with unread count badge and pulse animation.
  - Notification popover listing new episodes for followed films.
  - Clicking any notification item opens the Theater Modal directly at that updated episode and marks the notification as read.
  - In the Theater Modal episode matrix, the new episode is highlighted with a `[MỚI]` badge.
  - Adding/removing films from watchlist dynamically manages notification updates.
- **Duration Badge Sanitization**:
  - Cleaned duration strings to strip verbose parenthetical annotations (e.g. `(đã trừ video gộp trùng; tổng cộng tất cả video: 6 giờ 41 phút)`).
  - Duration badges now display strictly the clean, non-duplicated total duration (e.g. `4 giờ 20 phút`).
  - Implemented `cleanDurationStr` in `app.js` and sanitized `data.js`.

- **Feature 3: YouTube 30-Minute Auto-Update Engine**:
  - Implemented `scripts/update_youtube_feed.py` and `.github/workflows/auto_update_youtube.yml`.
  - Configured 30-minute cron schedule (`*/30 * * * *`) with manual `workflow_dispatch` trigger.
  - Automatically fetches XML RSS feeds of 8 partner YouTube channels without API keys.
  - Detected and ingested 56 new films and 14 new episodes from live YouTube channels, expanding catalog from 1,564 to 1,620 films.
  - Enhanced `app.js` to render live fetched YouTube timestamps (`publishedAt` / `updatedAt`) directly into the 24h newfeed.
  - Puppeteer screenshots verified: `new_live_youtube_feed` and `theater_modal_new_film`.

- **Feature 4: 100% Real YouTube Publish Dates (Fixed Fake Mock Timestamps)**:
  - Eliminated simulated `timeDeltas` mock array entirely.
  - Implemented `formatRealTimeAgo(isoString)` to compute true elapsed time from actual YouTube ISO timestamps.
  - Updated `film_2` ("Đô Thị Dị Năng: SSS Bị Phong Ấn 99%...") with its exact YouTube publish date (`2026-11-06T12:15:21Z`), changing its badge from fake "15 phút trước" to accurate "4 ngày trước".
  - Recent updates feed and notifications now strictly show real timestamps (e.g. 14 giờ trước, 1 ngày trước, 4 ngày trước).
  - Cleaned any legacy mock notifications from localStorage.
- **Cache-Busting & Instant Update Enforcement**:
  - Added cache-busting version hashes to asset links in `index.html` and automated bump inside `scripts/update_youtube_feed.py`.
  - Updated `vercel.json` to enforce `max-age=0, must-revalidate` for static files and `s-maxage=300, stale-while-revalidate=600` for `/api/(.*)`.
  - Updated schema version `20261112_v3_realtime` in `app.js` to purge stale caches.

- **Feature 5: Real-Time Vercel Live Feed API & True Duration Extraction**:
  - Created Vercel Serverless endpoint `api/live-feed.js` and local mirror `scripts/dev_server.py` (supporting `GET /api/live-feed`).
  - Enhanced `scripts/update_youtube_feed.py` to fetch real `lengthSeconds` & `publishDate` concurrently from YouTube watch pages (`ThreadPoolExecutor`), reverse-chronologically ingest RSS entries (preventing backward `updatedAt` overwrites), sort parts cleanly, and recalculate summed durations.
  - Executed `--backfill` across all 80 placeholder `7200s` films (`film_1621` -> `6 giờ 29 phút`, `film_1627` -> `6 giờ 24 phút`, etc.) + ingested 7 latest morning uploads (catalog now 1,633 films).
  - Updated `app.js` (`syncLiveYouTubeFeed`, strict 24h window in `Mới Cập Nhật 24h`, accurate part-number resolution in `openPlayer` fixing Part 48 playback).

- **Feature 6: Cloud IP Duration Reliability (Innertube Browse) & Merged-Episode Numbering Fix**:
  - Diagnosed root cause of `"Đang cập nhật"` durations on Vercel & GitHub Actions: YouTube gates `/watch?v=` on cloud datacenter IPs with bot verification HTML pages lacking `"lengthSeconds"`.
  - Upgraded `api/live-feed.js`, `scripts/update_youtube_feed.py`, and `scripts/dev_server.py` to fetch durations via YouTube Innertube `/youtubei/v1/browse` (`VLUU...` uploads playlist, up to 100 latest videos per channel in 1 call/channel, falling back to `/watch` `lengthSeconds`/`approxDurationMs`).
  - Replaced simple first-integer part parsing with `parse_part_info` (Python) and `parsePartInfoClient` (JS) supporting merged ranges (`Phần 1+2`, `Phần 1-3`, `Tập 793+794`, `Mùa 1-2`) and decimal sub-parts (`Phần 10.1`), sorting parts monotonically (`endNum, isMerged, startNum, subNum`) with unique `index = 1..N`.
  - Updated `app.js` (`SCHEMA_VERSION = '20261114_v4_browse_fix'`, `openPlayer`, `modalEpMatrix`, `rebuildRecentFeedAndGenres`, `syncLiveYouTubeFeed`) to resolve clicked episodes & notifications by `videoId` and array position (`data-ep-pos`), fixing `film_40` where clicking `Phần 5` previously matched `Phần 3`'s colliding `partNumber: 5`.
  - Backfilled 60/61 zero-duration parts (only removed video `cNRa9fBMKmY` in `film_268` remains 0), repaired 119 films with missing durations or misordered/colliding indices, and ingested 25 new films + 4 parts (catalog now 1,703 films).

- **Feature 7: UI Declutter & Full Responsive Fix (`index.html`, `style.css`, `app.js`)**:
  - Removed fake `#liveAudienceBadge` (`"842 người đang xem"`), dead `#btnHistoryOpen` / `#histCountBadge`, hardcoded `"1.564"` copy, and misleading `"Xem Nhiều"` label (renamed to accurate `"Cày Đêm (Dài Nhất)"` / `"Cày Đêm"`).
  - Replaced inline UI emojis (`🎲`, `⚡`, `🔥`, `❤️`, `🔔`, `✨`, `🎬`) with crisp SVG vectors / clean typography, and made `.brand-caption` (`#brandCaption`) update dynamically from `state.allFilms.length`.
  - Synced `.mobile-bottom-bar` `.dock-item.active` whenever category tabs or header favorites button change active tab.
  - Added `@media (max-width: 960px)`, `@media (max-width: 768px)`, and `@media (max-width: 480px)` responsive rules in `style.css`: `overflow-x: clip`, single-line header truncation (`min-width: 0`), fixed full-width `.notification-popover`, horizontal-scroll `.category-tabs-group` & `.mobile-chips-row` (hidden native scrollbar), hidden mobile `.key-hint` and duplicate `#btnDiceRandom`, safe modal/pagination/bottom-dock sizing.

- **Feature 8: Real YouTube Views/Likes Data, 3 Live-Selectable UI Layouts, Leaderboard & Inline Channel/Genre Filters (`v=20261116_094000`)**:
  - Upgraded `scripts/update_youtube_feed.py`, `api/live-feed.js`, and `scripts/dev_server.py` with:
    - Real `views`, `likes`, and `publishedAt` extraction using `YOUTUBE_API_KEY` (`videos.list?part=statistics,contentDetails,snippet`, 50 vids/call) when configured in env, plus zero-key Innertube `/youtubei/v1/next` (`hl: "en", gl: "US"`) fallback.
    - Innertube `browse VLUU...` fallback for RSS feed discovery when YouTube RSS XML returns HTTP 404/500.
  - Executed `python scripts/update_youtube_feed.py --backfill-stats`: populated real `views`, `likes`, and publish dates on 1,691/1,741 films (including 38 newly discovered films + 6 new parts across the 8 channels).
  - Implemented 3 live-switchable UI designs (`#uiVariantSwitcher` -> `v1`, `v2`, `v3`) persisted in `localStorage`:
    - `v1` (Editorial Bar & 3-Col Gold/Silver/Bronze Podium)
    - `v2` (Thumbnail Glass HUD Overlay & High-Density Chart Rows)
    - `v3` (Bento Dual-Pill Split & #1 Spotlight Hero Banner + #2/#3 Split)
  - Added dedicated `Bảng Xếp Hạng` tab (`#leaderboardPanel`, also accessible on mobile dock) with Metric (`Xem Nhiều Nhất` / `Yêu Thích Nhất`), Timeframe (`Hôm nay` / `Tuần này` / `Tháng này` / `Năm nay` / `All-time`), Channel selector, and Genre selector (synced two-way with sidebar/mobile chips).
  - Added inline Sort & Timeframe filter bar (`#inlineFilterBar`) inside every Channel & Genre browse view, plus full engagement stats inside `#theaterModal` (film header + per-episode capsule buttons) and `#randomModal`.

## Verification Completed
- `python -m py_compile scripts/update_youtube_feed.py scripts/dev_server.py`, `node --check app.js`, and `node --check api/live-feed.js` all exited `0`.
- Catalog audit: 1,741 total films (`1,691` with real views, likes, and dates; e.g. `film_559` = `4,504,472` views / `124,143` likes).
- Direct Node test of `api/live-feed.js`: HTTP `200`, `COUNT: 24` via Innertube browse RSS-fallback, with real `durationSec`, `views`, `likes`, and `publishedAt`.
- Puppeteer verification via `scripts/dev_server.py 18089`:
  - Desktop `1280×800`: tested standard feed & Leaderboard across `v1`, `v2`, `v3`; inline channel sorting + scope chip clearing; All-time Likes/Views Top 1 (`4,50Tr xem`, `124N thích`); Theater Modal engagement stats (`4.504.472 lượt xem • 124.143 lượt thích`, episode `11,4N xem • 168 thích`); screenshots of `v1`, `v2`, and `v3` Leaderboards inspected visually (`docSw = 1263 <= 1280`).
  - Mobile `375×812`: tested `v1`, `v2`, `v3` on both Feed and Leaderboard (`docSw = 375` across all 6 combinations, zero horizontal overflow) and mobile dock navigation.
