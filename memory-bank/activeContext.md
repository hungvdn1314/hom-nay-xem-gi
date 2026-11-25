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

## Major Feature & Polish Delivery (/goal 2026-11-17)
- **1. Genre Reclassification & Title Softening**:
  - Expanded `GENRE_RULES` with high-precision 3D vocabulary (Tu tiên, Quỷ dị, Đô thị, Võ hiệp, Cao võ, Trò chơi, Ngự thú, Hệ thống, Xuyên không). Reclassified 643 films out of fallback genre across 2,124 films.
  - Implemented `soften_caps_title` (Python) and `softenCapsTitle` (JS) preserving acronyms (`SSS+`, `FULL`, `P1-2`, `AI`, `3D`), softening 127 ALL CAPS titles across catalog and live feed.
- **2. Spotlight Hero Banner (`#spotlightHeroShell`)**:
  - Added top trending 3D showcase carousel with 16:9 poster backdrop, dark vignettes, kicker pill (`PHIM 3D NỔI BẬT HÔM NAY`), softened title, meta chips (parts, duration, genre, views, likes), synopsis, action buttons ("Xem Ngay Tập 1", "Lưu Vào Tủ Phim"), and 7s auto-advance dots.
- **3. Card Continue Watching Progress Bar**:
  - Added `.card-progress-bar-wrap` on film cards in `state.progress` showing track fill and `Đang xem Phần X / Y`.
  - Synchronized card badge layout (`.film-card.has-progress .card-duration-badge` to `bottom: 1.85rem`) preventing overlap.
- **4. Playback Resume Timestamp**:
  - Saved elapsed `timeSec` in `state.progress`. Reopens via YouTube iframe `&start=${timeSec}` if `timeSec > 15`. Listens to `infoDelivery` message events.
- **5. Standalone Smart QR Code (`#qrModal`)**:
  - Zero-dependency client-side pure JS QR SVG generator (`generateQrSvg`) creates scannable QR codes for instant mobile & Smart TV playback.
- **6. Theater Wide Mode & Ambient Dim**:
  - Added `#btnTheaterWide` (`.is-wide`, 96vw) and `#btnAmbientDim` (`.is-dimmed`, 0.08 opacity ambient, floating `#btnAmbientUndim`).
- **7. Auto-Play Next Episode**:
  - Added `#btnToggleAutoNext` and 5-second countdown overlay on episode completion (`playerState === 0`) with cancel / watch now actions.
- **8. Verification**:
  - Zero horizontal overflow on 375px (`scrollWidth: 358 <= 375`).
  - All features verified via Puppeteer MCP (`desktop_spotlight_hero.png`, `qr_modal_preview.png`, `mobile_view_375.png`).

## 2D Audio Purge & Channel Expansion (2026-11-20)
- **Root Cause & Diagnosis**:
  - Auto-discovered channels `thongocstudio`, `gavangtutien`, `thaolac`, `tydemuoi`, and `besuastudio` introduced 304 non-3D films (2D Manhua comic reviews, audio novel readings with static AI thumbnail, etc.) into the 3D Donghua catalog.
  - Previous `NON_3D_TITLE_REGEX` lacked keywords `review truyện`, `review manhua`, `truyện tranh`, `audio truyện`, `đọc truyện`, `kể truyện`, `bộ truyện`, `chap \d+`, `chương \d+`.
- **Implementation & Results**:
  1. **Purged 5 non-3D channels**: Removed `thongocstudio`, `gavangtutien`, `thaolac`, `tydemuoi`, `besuastudio`.
  2. **Hardened 3-layer 3D validation**:
     - `scripts/update_youtube_feed.py`: Hardened `NON_3D_TITLE_REGEX` & added `BANNED_CHANNEL_IDS` in `is_valid_3d_film_video`.
     - `api/live-feed.js`: Hardened `NON_3D_TITLE_RE` & `BANNED_CHANNEL_IDS` in `isValid3dFilmVideo`.
     - `app.js`: Hardened `NON_3D_CLIENT_RE`, added `BANNED_CHANNELS_CLIENT`, and filtered `state.channels`.
  3. **Added 2 user-requested 3D channels**:
     - `Kas Vietsub` (`@KasVietsub`, channelId `UCf-of2R81KFAFki2SkkIsBg`, 71 films).
     - `MyCherrySub` (`@MyCherrySub`, channelId `UC_Uo_2YxT471EiDlhJQri7A`, 92 films).

## Film ID Collision Bugfix (2026-11-20)
- **Issue Reported**: Clicking a card for "Oan Gia Ngõ Hẹp" (MyCherrySub) on the main screen opened a completely different film ("Thức Tỉnh Hệ Thống Hoá Độc Thành Đại Bổ" by Anime 3D).
- **Root Cause**:
  - A previous git 3-way merge on `data.js` and `youtube_films_catalog.json` produced overlapping `film_2386` for both "Hoá Độc" (Anime 3D) and "Oan Gia Ngõ Hẹp" (MyCherrySub).
  - In `app.js`, `state.allFilms.find(f => f.id === filmId)` returned the first film matching the duplicate ID.
- **Fix & Verification**:
  1. Rebuilt catalog deterministically: 2,077 pure 3D films numbered strictly uniquely (`film_1` to `film_2077`, 0 duplicates).
  2. Added runtime client-side de-duplication in `app.js` (`seenFilmIds`) in `normalizeAndIngestData`.
  3. Verified via Puppeteer: Clicking "Oan Gia Ngõ Hẹp" (`film_96`) opens the exact MyCherrySub video (`MtzynyYeqJg`), and clicking "Hoá Độc" (`film_11`) opens the Anime 3D video (`lDyoP1U9B5s`).

## Deep 3D Channel Discovery & Mid-Video Frame Audit (2026-11-23)
- **Methodology**:
  - Scanned 94 candidate channels across 12 diverse 3D search queries on YouTube.
  - Audited actual internal mid-video stream frames (`https://i.ytimg.com/vi/<VIDEO_ID>/2.jpg`) in addition to video descriptions to eliminate channels that use 3D cover thumbnails over 2D Manhua/sand-sculpture content.
  - Blacklisted `muoimuoilamphim` (3D cover but 2D Manhua inside) and `thietreview` (2D sand-sculpture meme animation) in `BANNED_CHANNEL_IDS` / `BANNED_CHANNELS_CLIENT`.
- **12 New Verified 3D Channels Integrated (13 -> 25 Channels)**:
  1. `soradub` (**Sora Dub**, `@SoraDub28`, `UCWw04AdPsuaf59SSjQHTTnw`): +100 films (100 parts)
  2. `tieumuoingontinh` (**Tiểu Muội Ngôn Tình**, `@TieuMuoiNgonTinh`, `UCS06BV2A7a_75mmB-KMjAiw`): +76 films (76 parts)
  3. `cibiisub` (**CibiiSub**, `@CibiiSub-01`, `UCoDbjVH_qTL7EvtEkTNpEzw`): +88 films (100 parts)
  4. `nguyentuongvietsub` (**Nguyễn Tường Vietsub**, `@Nguyentuongvietsub`, `UC1lnWK-xwvUT1NVNT6N0FRw`): +80 films (81 parts)
  5. `huyensutieumuoi` (**Huyền Sư Tiểu Muội**, `@HuyềnSưTiểuMuội`, `UCitGIROZ_grgO-ki_GZHs2A`): +46 films (46 parts)
  6. `2ksub` (**2K Sub**, `@2KSUB2000`, `UCOt427I8MNYQubeVLWqdn_g`): +98 films (98 parts)
  7. `naophangtutien` (**Não Phẳng Tu Tiên**, `@nao-phang`, `UCZFxno6YgiW4rIJb534B6TQ`): +69 films (98 parts)
  8. `hoatrenmay3d` (**Hoa Trên Mây**, `@hoatrenmay3D`, `UCO9uFz0jJC8YP60gLKwJJJQ`): +24 films (24 parts)
  9. `hhanime` (**HHANIME CHANNEL**, `@hhanimeofficial`, `UCP234GZcF-iOcYhImDCLQdQ`): +66 films (66 parts)
  10. `daudauvietsub` (**Đậu Đậu Vietsub**, `@daudau.vietsub`, `UCuJieQ2VOPxm1GVKvepWioA`): +99 films (100 parts)
  11. `godsub` (**GodSub**, `@Godsub01`, `UCnMTOk0TmPP49n7HMoRe9-w`): +25 films (25 parts)
  12. `phimzooai` (**Phim Zoo AI**, `@PhimZooAI`, `UCaJF3EewrPYPb1rHpSUKtDA`): +22 films (22 parts)
- **Catalog State**:
  - Total films: **5,708 pure 3D films** across **27 channels** with strictly sequential unique IDs (`film_1`..`film_5708`, 0 duplicates), including **607 unified multi-part series** (14 cross-channel series).
  - Upgraded `fetch_channel_browse_data` (`fetch_all_pages=True`) to follow YouTube Innertube `continuationCommand` pagination without any 100- or 400-video limit, crawling 100% of every channel's video history (+3,551 historical 3D episodes ingested, recovering all older Phần 1, 2, 3 uploads).
  - Added `series_grouping_key` (Python) and `seriesGroupingKeyClient` (JS) to unify all episodes of the same series both within a channel and across related channels (`channelIds` multi-channel support in `app.js` and `sync_channel_meta`).
  - Added `\baudio\b` to `NON_3D_TITLE_REGEX` / `NON_3D_TITLE_RE` / `NON_3D_CLIENT_RE` to block audio novel videos (`FUll bộ Audio`).
  - Verified live via Puppeteer (`Tất cả 27 kênh 5708`, verified 4-part playback on *Thân Ở Thế Giới Quỷ Dị*, *Người Khác Ngự Thú Tôi Ngự Thiên Sứ*, and *Toàn Dân Cai Ngục Sinh Tồn*).

## Akatsuki Review Channel Integration (2026-11-24)
- Added 28th partner channel: `akatsukireview` (**Akatsuki Review**, `@Akatsuki-KT`, `UCRkGgoKdH3K05UdgRamBb3Q`).
- Updated `CHANNEL_SUFFIX_RE`, `LEAD_TOKEN_RE`, `parse_part_info` (Python) and `cleanCoreTitleClient`, `parsePartInfoClient` (JS) to handle concatenated prefixes (`FULLSS1`, `Full SS1-4END`, `FullTập1-185END`) and `| Akatsuki Review` suffixes.
- Crawled 100% of channel history (383 videos -> 187 valid 3D films >=20m -> unified into **120 films** on `Akatsuki Review`).

## Spotlight Hero v2 Overhaul — Content Curation & Asymmetric Nordic Split Stage (2026-11-24)
- **Catalog Content Repair & Plot Enrichment (`scripts/update_youtube_feed.py`, `api/live-feed.js`, `data.js`, `youtube_films_catalog.json`)**:
  - Added `is_generic_title_segment` / `isGenericTitleSegmentClient` + expanded `LEAD_TOKEN_RE` and `NON_3D_TITLE_REGEX` (`nhạc phim cổ phong`, `nhạc không lời`, `ost`, `bgm`).
  - Unmerged 18 corrupted generic-prefix buckets (e.g., `( Tổng Hợp ) FULL` 78 parts, `( Trọn Bộ )` 18 parts, `( Siêu Hay )` 6 parts) into **139 clean individual series** and filtered 1 non-3D music compilation (`film_2748`), bringing catalog to **5,980 unique 3D films across 28 channels** (0 duplicate IDs, 7,390 valid 3D parts).
  - Enriched 47/53 top trending Spotlight candidates with genuine YouTube plot descriptions via Innertube `/youtubei/v1/next`, and hardened `clean_plot_summary` / `cleanPlotSummary` to strip channel promo/Zalo/copyright/content-rating boilerplate.
- **Spotlight Hero v2 Design & Logic (`app.js`, `style.css`, `index.html`, `DESIGN.md`)**:
  - Replaced single-box dark-vignette banner with **Asymmetric Nordic Split Cinema Stage** (`1.85fr` 16:9 HD poster stage + `0.95fr` Frosted Glass Up-Next Rail on desktop; stacked 16:9 poster above body + horizontal touch-scroll rail on `<= 1080px` / `375px` mobile).
  - Upgraded `getSpotlightCandidates()` to rank Top 6 curated films by recency decay + views/likes engagement + multi-part richness + clean plot synopsis, diversified max 1 film per channel.
  - Added `formatSpotlightEditorial()` (splits long titles into crisp Display Title + Glacier Ice Blue Hook, strips echo/machine-tail text from synopses, also applied inside `#randomModal` and `#theaterModal`) and `getHiResPosterUrls()` (`maxresdefault.jpg` 1280×720 with automatic `120×90` placeholder & error fallback to `sddefault` -> `hqdefault`).
  - Implemented non-destructive `updateSpotlightSlide()` crossfade switching with 7s rail progress indicator, pause on hover, keyboard `←`/`→`, horizontal swipe, `"Xem Ngay"` / `"Tiếp Tục Phần X"`, `"Chi Tiết"`, and `"Lưu Phim"` actions.
- **Verified Live via Puppeteer**: Desktop `1440×900` (`overflowX: false`, all 6 `maxresdefault.jpg` loaded at `1280×720`, 44px CTAs, interactive rail click / Chi Tiết modal / Xem Ngay theater modal) and Mobile `375×812` (`docScrollW: 375`, `overflowX: false`, horizontal rail scroll, 44px CTAs).

## Production Redesign Release — Ambient Cinema Hybrid A+B & Custom Logo (`v=20261125_020000`)
- **Brand Identity (`logo.svg`)**: Created custom isometric 3D Cinema Prism Aperture logo (`logo.svg`), integrated inline into header `#brandHomeBtn` and `<link rel="icon">`.
- **UI Architecture (`index.html`, `style.css`, `app.js`, `DESIGN.md`)**:
  - Replaced Nordic Pure Glass light-blue chrome with **Ambient Cinema (`#060608` Obsidian / `#F43F5E` Cinema Crimson / `Space Grotesk` + `Be Vietnam Pro` + `JetBrains Mono`)**.
  - Kept the full-bleed **Ambient Cinema Hero** (`#spotlightHeroShell` -> `.ambient-hero` with blurred dynamic Ambilight aura and 6-thumbnail rail) permanently mounted so switching tabs or genres produces **0px vertical scroll jump** (`overflow-anchor: none` + locked `min-height: 780px`).
  - Eliminated intermediate carousels and combined **Option B Sticky Command Dock** (`Tất Cả`, `Mới 24h`, `Bảng XH`, `Cày Đêm >6h`, `Series Dài`, `Phim 1 Tập`, `Tủ Phim` + count + Sort/Time selects) with **Option A Sticky Left Attribute Sidebar** (`Thể loại 3D`, `Thời lượng`, `Nguồn Studio` opening native `popover="auto"` `#channelDrawer`) and a clean **3-column Cinema Grid** with bottom-edge hover quick actions (`Xem Tập 1` / `Chi Tiết`).
  - Preserved all existing subsystems: Notification Bell, Continue Watching & YouTube resume timestamp, Theater Wide/Dim/Auto-Next, standalone QR Code Modal, Chart Leaderboard, and URL deep-linking.
  - Cleaned up temporary multi-option preview files (`demo*`, `demo2*`, `demo3*`).

## Official Logo Finalization — Option 08 (Clapperboard 3D · Play-AI)
- **Selected Brand Mark (`logo.svg`)**: Promoted user-approved Option 08 (`Clapperboard 3D · Play-AI`, `897 bytes`, `svg_audit.py` score `100/100`) to `logo.svg` and inline `#brandHomeBtn` SVG (`viewBox="0 0 256 256"`, 4 paths, zero gradients). Features a `#FFFFFF` slate with `30°` Play cutout (`fill-rule="evenodd"`), centered `#F43F5E` 4-point AI Spark core, `-15°` crimson clapper bar (`75°` stripe cuts), and `45°`-beveled 3D crimson side extrusion slab.
- **Full Web & PWA Icon Suite (`icons/`)**: Exported `icons/favicon.svg` (adaptive `#09090B` / `#FFFFFF` via `prefers-color-scheme`), obsidian-tiled `icons/favicon.ico` (`16/32/48`), `icons/apple-touch-icon.png` (`180×180`), `icons/icon-192.png`, `icons/icon-512.png`, `icons/maskable-512.png`, `icons/site.webmanifest`, and `logo-light/black/white/square/favicon/app-icon.svg`.
- **Integration & Cleanup**: Linked the full icon suite in `index.html` `<head>` with `<meta name="theme-color" content="#060608">`, updated `DESIGN.md` to v5.1.0, and removed temporary `logo-preview.html` and `logo-preview/`.
- **Header Alignment & Ambient Glass Actions (`v=20261125_031500`)**: Cropped inline logo `viewBox="16 20 224 212"` with optical centering (`translateY(-2px)` on `.brand-logo-svg`, `translateY(+2px)` on `.brand-title`), unified all right-side actions (`29 Kênh` 4-tile grid, Bell + floating `#notifCountBadge`, Bookmark + `#favCountBadge`, and Crimson-glass `Ngẫu Nhiên` 4-point Spark CTA) at `36px` height & `8px` radius.

## Continue Watching Layout Fix & 29th Channel (`Mị Ảnh Studio`)
- **Continue Watching & Related Cards (`style.css`)**: Locked `.continue-card` (`width: 250px; min-width: 0; max-width: 250px`), `.related-card` (`210px`), `.continue-meta` (`width: 100%; min-width: 0`), and `.continue-card:not(.related-card)` (`200px` on `<= 640px` mobile) so long `white-space: nowrap` film titles never distort `16:9` thumbnail widths across Desktop (`1440px`) and Mobile (`375px`).
- **29th Partner Channel Integrated (`Mị Ảnh Studio`)**: Added `mianhstudio` (`UCf6RjHLIxO2DYaH7PR2OvuQ`, `@MịẢnhStudio`) to `scripts/update_youtube_feed.py`, `api/live-feed.js`, and `index.html`; backfilled 31 valid 3D series (32 valid uploads total, 0 `< 20m` shorts).

## Multi-Select Filters, Auto Linked-Channel Merging & 31 Channels
- **30th & 31st Channels Integrated**: Added `trumphimsinhton` (**Trùm Phim Sinh Tồn New**, `UCAJdyl3HED639LTM76i7FcQ`) and `sinhtontanthe` (**Sinh Tồn Tận Thế**, `UCHDAV_skG6U-BClpm3ik10Q`) in `scripts/update_youtube_feed.py`, `api/live-feed.js`, and `index.html`; total catalog now **6,549 unique 3D films across 31 channels** (`0` duplicate IDs).
- **Auto Linked-Channel Grouping**: Added `_walk_home_linked_channel_ids`, `_fetch_channel_home_signals`, `scan_channel_ownership_signatures`, `detect_linked_channel_groups` (Union-Find over hashed YouTube Home `WEB_PAGE_TYPE_CHANNEL` Collaborator/Featured links, bank/email/social signatures), and `merge_linked_group_films` in `scripts/update_youtube_feed.py` (`--sync-groups`). Automatically grouped **2 clusters (25 unified studio entries)**: `Hệ Thống Mộng Ảnh Studio` (6 sister channels) and `Hệ Thống Trùm Phim Sinh Tồn New` (`Trùm Phim Sinh Tồn New` + `Sinh Tồn Tận Thế`).
- **Multi-Select Channel & Genre Filtering**: Migrated `app.js` filter state from single strings to `Set`s (`selectedChannels`, `selectedGenres`, `genreMatchMode` `or`/`and`), added multi-check UI in Sidebar, `#channelDrawer`, `#mobileFilterDrawer`, Leaderboard `#btnLbChannels`/`#btnLbGenres`, `#activeScopeBadges` individual `×` removal + `Xóa tất cả`, and multi-value URL params (`?channels=...&genres=...&gmode=and` with legacy `?channel=`/`?genre=` fallback).

## Full-Screen `100dvh` MUBI Minimalist Cinema Hero + Scroll-Revealed Chrome (2026-11-26)
- **Hero Architecture (`index.html`, `style.css`, `app.js`, `DESIGN.md` v5.2.0)**:
  - Promoted Spotlight Hero (`#spotlightHeroShell`) to `100dvh` full-viewport theater mode with dual-layer `#spotlightBgA`/`#spotlightBgB` cross-fade + `18s` Ken Burns drift (`body.is-scroll-gliding` / `body.is-hero-paused` pause), unboxed top-left `.hero-brand-mark` signature, clean `extractCleanPlotSummary` story synopses (boosting rich-story candidates in `getSpotlightCandidates`), solo `[ ▶ Xem Ngay ]` CTA, MUBI 6-title hairline rail (`#spotlightTitleRail`) + `#btnSpotlightPause`, and bare scroll cue (`Cuộn xuống để xem thêm nội dung`).
  - Hid `#siteHeader` & `#mobileBottomBar` while in the Hero zone (`is-hero-hidden` + `inert`), sliding them in cleanly once scrolled down into `#browseWorkspace` (`#continueShelf` + `#catalogSection`).
  - Implemented `ResizeObserver`-cached native compositor `scrollToCinemaZone` with wheel/touch seam snapping (`0` ↔ `#browseWorkspace`), `scrollend` mid-seam settle, `/` focus-search on `scrollend`, deep-link Browse auto-scroll, and 100% free catalog scrolling below.
  - Verified live via Puppeteer on Desktop `1440×900` & Mobile `375×812` (`overflowX: false`, player open/close, `0 <-> 900` & `0 <-> 812`, `/` focus `#searchInput`, `#brandHomeBtn` return to `0`, mid-seam settle `440 -> 900`, deep free scroll `1800`) and removed temporary `hero-preview.html`.
  - **Upward Scroll Smoothing & Mobile Polish**: Removed `contain: layout paint style` on `.cinema-hero-shell`, fixed `.cinema-bg-layer` `max-width: none` (eliminating 24px right-edge gap across all viewports), added mobile portrait framing (`object-position: center 22%`, full-width portrait scrim, `480px` compact typography + full-width CTA, safe-area padding), implemented direction-aware `_scrollDir` + `_deepScrollUpGuardUntil` inertia buffer + immediate chrome hide on upward glide, and synced `syncActiveRailScroll()` on `#spotlightTitleRail`. Verified across `1440×900`, `375×812`, and `360×667` (`overflowX: false`, `upwardSettledY: 0`, `slide3Visible: true`, `slide6Visible: true`).
  - **Minimalist Cinema Footer (`#siteFooter`)**: Added `<footer>` after `</main>` in `index.html`, styled `.site-footer` in `style.css` (`HÔM NAY XEM GÌ · Kho phim hoạt hình 3D` left with optically aligned `22px` logo + `© 2026 IrrationaL.` right, centered cleanly above `.mobile-bottom-bar` on `<= 768px`), and wired `#footerHomeBtn` to `scrollToCinemaZone('hero')` in `app.js`. Verified via Puppeteer (`1440×900` & `375×812`, `overflowX: false`).

## 35 Channels & Symmetric Sister-Channel Auto-Grouping (2026-11-26)
- **4 New Partner Channels Added (`scripts/update_youtube_feed.py`, `api/live-feed.js`, `index.html`, `app.js`)**:
  - `eggvietsub` (**Egg Vietsub**, `@EggVietsub`, `UCXeIf2LpGOlWpBPkREGqfVg`): `29` pure 3D films.
  - `larasub22` (**Lara Sub**, `@larasub22`, `UC_bkg5xRmFQJz7g6sodwJFQ`): `11` pure 3D films.
  - `mycherrysub2` (**Bản Tin Cherry**, `@MyCherrySub2`, `UCcmWQRyhWaWCagWSKcTPKtw`): `166` pure 3D films.
  - `mycherrysub3` (**HiCherrySub**, `@MyCherrySub3`, `UCorfR4slA9HETbelKTIJZwg`): `4` pure 3D films.
- **Symmetric Sister/Bio Auto-Grouping**: Upgraded `_extract_ownership_signatures` + `scan_channel_ownership_signatures` to match parent/sister bio phrases (`kênh phụ ... <name>`) and emit `ytlink:` signatures symmetrically to both channels. Automatically detected **3 studio clusters (`27` unified studio entries across `35` channels)**: `Hệ Thống Mộng Ảnh Studio` (`6 kênh`), `Hệ Thống MyCherrySub` (`3 kênh`: `MyCherrySub` + `Bản Tin Cherry` + `HiCherrySub`, `660` merged series, `6,737` unique films total), and `Hệ Thống Trùm Phim Sinh Tồn New` (`2 kênh`).
- **Verification**: `py_compile`, `node --check app.js`, `node --check api/live-feed.js` exited `0`; Puppeteer live check verified `35 Kênh`, `27` studio entries, and multi-select filtering (`eggvietsub` + `group_mycherrysub` = `689 BỘ PHIM`, `overflowX: false`).
