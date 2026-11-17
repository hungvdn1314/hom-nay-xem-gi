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

- **Feature 8 (Finalized Design `v=20261116_100000`): Real YouTube Views/Likes, Bento Card Stats & High-Density Chart Leaderboard**:
  - Finalized user-selected hybrid UI combining **Mẫu 3 Cards** (`.card-bento-stats` dual Bento pills showing compact Views & Likes under every card body) with **Mẫu 2 Leaderboard** (`.chart-table-head` + `.chart-row-card` high-density ranked chart rows), and removed the temporary `#uiVariantSwitcher` comparison bar and unused layout styles.
  - Upgraded `scripts/update_youtube_feed.py`, `api/live-feed.js`, and `scripts/dev_server.py` with `YOUTUBE_API_KEY` (`videos.list?part=statistics,contentDetails,snippet`) + zero-key Innertube `/youtubei/v1/next` & `browse VLUU...` RSS-outage fallback (enriched 1,691/1,741 static films + live `/api/live-feed` discoveries).
  - Kept multi-dimensional `Bảng Xếp Hạng` (`Views` / `Likes` × `Hôm nay` / `Tuần này` / `Tháng này` / `Năm nay` / `All-time` × `Channel` × `Genre`), inline `#inlineFilterBar` Sort & Timeframe toolbar inside every Channel & Genre browse view, and engagement stats inside `#theaterModal` & `#randomModal`.

- **Feature 9 (Review Polish `v=20261116_104000`): Strict 3D-Only Catalog Filter, Weighted 10-Genre Classifier, Minimal Header & Rich Randomizer Spotlight**:
  - **Feedback 1 (Header)**: Removed `.brand-caption` (`"XX BỘ PHIM • 8 KÊNH YOUTUBE"`) under `HÔM NAY XEM GÌ` in `index.html`, `style.css`, and `app.js`.
  - **Feedback 2 (Rich Randomizer Modal)**: Upgraded `#randomModal` into a full Spotlight Preview dialog featuring close button `#btnCloseRandom`, 16:9 poster (`#randomThumbImg`) with Parts / Updated-Time / Duration badges, tags row (`#randomTagsRow`), 4-box Bento stats grid (Duration, Parts, Views, Likes), cleaned plot synopsis (`#randomFilmSynopsis`), and Watch / Roll / Bookmark actions.
  - **Feedback 3 & 4 (Weighted 3D Genres + 2D Audio Filtering)**:
    - Switched `browse VLUU...` requests to `hl: "vi", gl: "VN"` across `scripts/update_youtube_feed.py` and `api/live-feed.js` (supporting both Vietnamese and English relative timestamps/compact counts) to preserve original Vietnamese titles.
    - Added `is_valid_3d_film_video` / `isValid3dFilmVideo` / `isValid3dFilmClient` filtering out `< 20m` (`< 1200s`) videos, 2025 `chiuchiusubtv` 2D audio uploads, and `EPISODE/TẬP 7xx` (`NGỰ THÚ SƯ MẠNH NHẤT` / `8-DuVCodA5c`) 2D Manhua Audio episodes; restored `film_559` to `"FULL MÙA 1 | KẺ LÀM MÀU MẠNH NHẤT"`.
    - Replaced `GENRE_KEYWORDS` with weighted 10-genre `GENRE_RULES` + `"Hoạt hình 3D Chọn Lọc"` fallback, stripped donation/bank/subscribe boilerplate via `clean_plot_summary` / `cleanPlotSummary`, updated `filmMatchesGenre` for multi-tag filtering/counting in `app.js`, and ran `--clean-3d` (removing 119 2D/short films, keeping 1,624 clean 3D films, reclassifying 1,086 films).

## Verification Completed
- `python -m py_compile scripts/update_youtube_feed.py scripts/dev_server.py`, `node --check app.js`, and `node --check api/live-feed.js` exited `0`.
- Catalog audit after `--clean-3d`: 1,624 3D films across 11 clean genres, `has 8-DuVCodA5c: False`, `<20m films: 0`, `bank boilerplate reviews: 0`, `film_559` = `('FULL MÙA 1 | KẺ LÀM MÀU MẠNH NHẤT', 1, '2 giờ 35 phút')`.
- Direct Node test of `api/live-feed.js`: HTTP `200`, `COUNT: 23`, `BAD_2D: 0`.
- Puppeteer verification on `scripts/dev_server.py 18091`:
  - Desktop `1280×800`: `#brandCaption === null`, `bad2dInDom === 0`, 11 clean genres rendered, `#randomModal` opens cleanly (`dlgScrollH = 699, dlgClientH = 699, needsScroll = false`, `docSw = 1263 <= 1280`), visually inspected screenshot (`random_modal_desktop_clean`).
  - Mobile `375×812`: `docSw = 375`, `docSwModal = 375`, `overflowX = false`, `#brandCaption === null`, Randomizer Modal opens and closes cleanly.


## Session update — Channel discovery + UX upgrade
- `scripts/update_youtube_feed.py`: `CHANNELS` now 16 (8 original + 8 auto-discovered vetted channels), `--discover-channels` (Innertube search >20m + 3D Quality Gate: >=80% of latest 20 uploads >=40m & valid 3D) stages candidates in `discovered_channels.json`; new channels auto-backfill ~60 uploads; `sync_channel_meta` keeps `data.channels`. `api/live-feed.js` mirrors the channel list. ToonWarp Studio was rejected (mixed short comedy content).
- `app.js`: Continue Watching shelf (`homnayxemgi_progress`, resumes last episode), theater modal (prev/next episode, share, open on YouTube, tags->filter, synopsis, related films), URL deep-linking (`?film=&ep=&tab=&channel=&genre=&metric=&range=`), duration filter, 2 genre chips + "Tóm tắt" spotlight on cards, mobile search auto-scroll.
- Catalog: 2,059 films / 16 channels.

## Auto-Update Diagnosis & Fix (2026-11-17)
- **Root Cause Identified**:
  1. `syncLiveYouTubeFeed()` in `app.js` runs client-side when the user visits the website, calling `/api/live-feed` to fetch YouTube uploads in real-time. This created the exact perception that "it only updates when I open the website".
  2. The background cron on GitHub Actions (`schedule: - cron: '*/30 * * * *'`) was suffering from extreme GitHub Actions runner queue delays on public/free tier (running once every 6 to 13 hours instead of every 30 minutes, e.g. 02:13 UTC to 15:24 UTC with zero runs).
  3. `auto_update_youtube.yml` previously only staged `git add data.js youtube_films_catalog.json` without `index.html`, leaving `index.html` referencing an older `data.js?v=...` query string.
- **Implemented Fixes**:
  1. Added `no-cache, no-store, must-revalidate` headers in `vercel.json` specifically for `/data.js` and `/youtube_films_catalog.json` so browsers and edge caches never serve stale catalog files.
  2. Created `/api/cron-update.js` endpoint which allows external schedulers (e.g. `cron-job.org`, UptimeRobot, or Vercel Cron) to trigger GitHub Actions `workflow_dispatch` instantly without waiting on GitHub's delayed schedule queue.
  3. Bumped asset cache string in `index.html` (`v=20261117_153000`).
  4. Successfully triggered `workflow_dispatch` (Run 44046428385), fetching 13 new films and 2 episodes into `data.js` (commit `201ad70`).
