# System Patterns — Hôm Nay Xem Gì (24h Live Feed & Notification Engine Edition)

## Architecture
- **Design Philosophy**: Nordic Minimalist Pure Glass (Scandinavian Humanist Streaming UI).
- **Core Design Tokens**:
  - Background Canvas: Arctic Slate `#0B0D11`
  - Glass Surfaces: Frosted Glass `rgba(255, 255, 255, 0.035)` to `0.065` with `backdrop-filter: blur(20px)`
  - Frosted Capsule: Deep Opaque Glass `rgba(11, 15, 23, 0.88)` with `backdrop-filter: blur(8px)`
  - Primary Accent: Glacier Ice Blue `#38BDF8` (Sky 400)
  - Secondary Accents: Amber Gold `#F59E0B` (Duration clock & Hot badge), Crimson `#EF4444` (Bookmarks)
  - Typography: Google Font `Plus Jakarta Sans` across entire interface for flawless Vietnamese diacritics and geometric precision.

## New Feature Subsystems
1. **24-Hour Live Update Newfeed Engine**:
   - Tab: `[⚡ Mới Cập Nhật 24h]` in the master category tabs with dynamic count badge (`#tabRecentBadge`).
   - Dynamic delta timestamps: "15 phút trước", "35 phút trước", "1 giờ trước", etc.
   - Real-time update pill on film cards (`.card-update-pill`): `⚡ [Thời gian]`.
   - Chronological sorting by update timestamp descending.

2. **Follow & Notification Subsystem**:
   - Header Notification Bell (`#btnNotifOpen`): Features unread counter badge (`#notifCountBadge`) with pulsating beacon animation when unread updates exist.
   - Notification Popover Drawer (`#notificationPopover`): Frosted glass panel listing recent episodes of films followed by the user.
   - Quick Episode Play: Clicking any notification marks it as read, closes the popover, and instantly launches the Cinema Theater Modal directly at the updated episode.
   - Visual Indicators:
     - Card bookmark button (`.card-fav-btn`) acts as follow/unfollow toggle with instant toast confirmation.
     - Updated episode button in Theater Modal matrix features a glowing `.is-new` border and `[MỚI]` tag.
     - "Đã đọc hết" button to clear notification count.
   - LocalStorage synchronization (`homnayxemgi_favs`, `homnayxemgi_notifs`).

3. **Core Streaming Features**:
   - 16:9 Widescreen Film Cards with high-contrast frosted capsules ("Trọn bộ 1 tập" / "N phần") and pure SVG icons.
   - 64px Floating Frosted Glass Header (Brand title "HÔM NAY XEM GÌ", Randomizer on desktop, Notification Bell, Watchlist Bookmark) + Mobile Bottom Dock.
   - Two-Column Workspace (Sidebar: 11 weighted 3D Genres sorted by prevalence + 8 YouTube Channels | Main Feed: 16:9 Cards & Chart Mode).
   - Cinema Theater Modal with YouTube player, film engagement totals, and per-episode duration + view/like stats.
   - **Spotlight Randomizer Modal (`#randomModal`)**: Displays 16:9 poster, parts/duration/freshness badges, channel & multi-genre pills, 4 Bento stat boxes (Duration, Parts, Views, Likes), cleaned plot synopsis, and Watch / Roll / Bookmark actions.
   - **Weighted 3D Genre Classifier & Strict 3D Filter**: `GENRE_RULES` scores world-setting tiers higher than trope modifiers (`clean_plot_summary` removes bank/donate boilerplate); `is_valid_3d_film_video` / `isValid3dFilmClient` exclude 2D Manhua Audio series (`Tập 7xx`, `NGỰ THÚ SƯ MẠNH NHẤT`), 2025 `chiuchiusubtv` 2D uploads, and `<20m` clips.

4. **Dual Real-Time & Scheduled YouTube Synchronization Engine**:
   - **Live Serverless Edge API (`api/live-feed.js`)**: Runs on Vercel Node.js Serverless runtime with 5-minute Edge CDN caching (`s-maxage=300, stale-while-revalidate=600`). Uses YouTube RSS feeds concurrently with Innertube `/youtubei/v1/browse` (`VLUU...`, acting as both duration map and RSS-outage fallback), and enriches `views`, `likes`, and `publishedAt` via `YOUTUBE_API_KEY` (`videos.list?part=statistics,contentDetails,snippet`) or `/youtubei/v1/next`.
   - **Local Dev Mirror (`scripts/dev_server.py`)**: Serves static assets and mirrors `GET /api/live-feed` locally (`run_web.bat`).
   - **Persistent Catalog Updater (`scripts/update_youtube_feed.py`) & GitHub Actions**: Processes RSS feeds / Innertube browse fallback chronologically (oldest -> newest), collects views/likes/publish dates via `YOUTUBE_API_KEY` or Innertube `/next` (`--backfill-stats`), parses full merged ranges (`1+2`, `1-3`, `793+794`), assigns unique monotonic `index` (`1..N`), recalculates totals (`totalDurationSec`, `totalViews`, `totalLikes`), and bumps cache-busting query versions in `index.html`.
   - **Strict 24h Window & Exact Episode Playback**: `Mới Cập Nhật 24h` strictly shows updates within 24h; `openPlayer` and `#modalEpMatrix` resolve episodes by exact `videoId` and array index (`data-ep-pos`, fallback `partNumber`).

5. **Bento Card Stats, High-Density Chart Leaderboard & Inline Scope Filters**:
   - **Bento Dual-Pill Cards (`.card-bento-stats`)**: Standard 16:9 film cards display compact `tabular-nums` Views & Likes Bento pills cleanly below channel/genre metadata.
   - **Chart Leaderboard (`#leaderboardPanel`, `.chart-table-head`, `.chart-row-card`) & Period Engagement Scoring (`getFilmPeriodMetrics`)**: Ranks films in high-density chart rows by `views` or `likes` summed within `day` (24h), `week` (7d), `month` (30d), `year` (365d), or `all` across all or scoped Channels × Genres (synced two-way with Sidebar & Mobile Chips).
   - **Inline Channel/Category Toolbar (`#inlineFilterBar`)**: Lets users sort any Channel or Genre view by `Mới cập nhật`, `Xem nhiều nhất`, `Yêu thích nhất`, or `Cày đêm (Dài nhất)` within any timeframe window.
