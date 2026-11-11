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

## Verification Completed
- End-to-end Puppeteer verification executed and passed:
  - Duration badge cleanup verified with 0 violations across all 1,564 films.
  - Notification Popover screenshot taken (`notification_popover_open`).
  - Episode click & player launch screenshot taken (`modal_with_new_episode`).
  - 24h Newfeed screenshot taken (`recent_24h_newfeed`).
