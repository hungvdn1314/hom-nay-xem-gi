# Tech Context — Film AI 3D Web App

## Technologies
- **HTML5:** Semantic markup, accessibility tags (`aria-*`, `role`), WCAG AA compliant.
- **CSS3:** Custom properties (design tokens), CSS Grid, Flexbox, backdrop-filter, smooth transitions.
- **JavaScript (ES6+):** Pure vanilla JS, debounced search, DOM manipulation, YouTube Embed API integration, LocalStorage for state persistence.
- **Assets:** YouTube CDN (`https://i.ytimg.com/vi/{id}/hqdefault.jpg`), Lucide SVG vector icons.
- **Testing:** Python `http.server`, Puppeteer MCP for visual regression and interaction verification.

## Channel Sources & Discovery (update)
- 28 YouTube channels are tracked (see `CHANNELS` in `scripts/update_youtube_feed.py`, mirrored in `api/live-feed.js`). Keep both lists identical.
- `python scripts/update_youtube_feed.py --discover-channels` searches YouTube for new 3D film channels, scores them with the 3D Quality Gate and writes `discovered_channels.json` (manual approval; add approved entries to both `CHANNELS` lists).
- `YOUTUBE_API_KEY` (GitHub Secret) enables YouTube Data API v3 stats; zero-key Innertube (`browse VLUU...`, `next`, `search`) is the fallback.
- Local static test: `python -m http.server 18091` (use a high free port; `scripts/dev_server.py` gave empty responses on 18090). `.github/workflows/*` must not be edited (token lacks `workflow` scope).
- New localStorage key: `homnayxemgi_progress` (continue watching).
