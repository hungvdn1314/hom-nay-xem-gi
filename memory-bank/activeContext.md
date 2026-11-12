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

## Verification Completed
- End-to-end verification executed and passed after final edits:
  - Direct Node execution of `api/live-feed.js`: HTTP 200, 24 live videos with real durations in ~2.5s.
  - Puppeteer verification via `scripts/dev_server.py` on `http://localhost:8080`:
    - `⚡ Mới Cập Nhật 24h` badge: `29` films strictly within 24h (newest `34 phút trước`, `9 giờ 36 phút`).
    - `film_1621` verified `6 giờ 29 phút` instead of `2 giờ 00 phút`.
    - `film_301` (`Nhất Kiếm Trường Sinh`) Theater Modal verified playing `Phần 48` (`GRnhern5-z0`) with ordered episodes `Phần 43..48` and exact durations (`2:25:31 [MỚI]`).
    - Screenshot taken (`fixed_24h_live_feed`).
