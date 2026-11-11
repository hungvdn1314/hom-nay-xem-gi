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
   - 16:9 Widescreen Film Cards with high-contrast frosted capsules ("Trọn bộ 1 tập" / "N phần").
   - 64px Floating Frosted Glass Header with Live Audience Counter (`● 842 người đang xem`).
   - Two-Column Workspace (Sidebar: 10 Genres + 8 YouTube Channels | Main Feed: 16:9 Cards).
   - Cinema Theater Modal with YouTube player and episode matrix switcher.
   - Randomizer Modal ("Gợi ý phim 🎲").
