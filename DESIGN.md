# Brand & Design System: Hôm Nay Xem Gì (Ambient Cinema · Hybrid A + B)

> Version: 5.1.0 (Official Production Release)  
> Aesthetic Persona: Ambient Cinema (Editorial Dark Obsidian + Frosted Command Dock + Sticky Sidebar Rail)  
> Brand Mark: Custom Clapperboard 3D · Play-AI Emblem (`logo.svg` + `icons/`)

---

## 1. Executive Summary & Design Read
- **Product Kind**: Curated 3D donghua, anime, and animated series cinema archive (`6,024` pure 3D films across `29` vetted YouTube channels).
- **Design Read**: `Reading this as: High-contrast dark-room cinema library ("Hôm Nay Xem Gì") for Vietnamese 3D donghua enthusiasts, pairing full-bleed Ambilight editorial spotlighting with a frictionless dual-axis Command Dock + Sticky Sidebar catalog.`
- **Logo Identity (`logo.svg` & `icons/`)**:
  - Audited `100/100` (`svg_audit.py`) flat architectural 256×256 vector mark (`fill-rule="evenodd"`, zero gradients, `#FFFFFF` primary on dark / `#09090B` primary on light + `#F43F5E` Brand Crimson accent).
  - Combines a `-15°` hinged cinema clapperboard (`75°` cutout bars), a `45°`-beveled 3D crimson side depth plate, and a central `30°` negative-space Play cutout centered around a 4-point AI Spark core.
  - Exported full responsive & PWA icon suite in `icons/` (`favicon.svg` with light/dark `prefers-color-scheme` CSS, obsidian-tiled `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`, and mono/light/dark SVGs).
- **Anti-Patterns Avoided**: No AI-purple cyan glows, no UI emojis, no redundant discovery carousel bloat between Hero and Catalog, and zero layout jump when filtering.

---

## 2. The 8 Core Design Dimensions
1. **Color Palette**:
   - `--bg-canvas: #060608` (Obsidian Void)
   - `--bg-surface: #111116` (Elevated Obsidian)
   - `--bg-elevated: #1A1A22` (Control Surface)
   - `--text-primary: #F8FAFC` / `--text-secondary: #C4C7D0` / `--text-muted: #848894`
   - `--border-hairline: rgba(255, 255, 255, 0.1)` / `--border-strong: rgba(255, 255, 255, 0.25)`
2. **Accent (< 10% surface)**: `--accent: #F43F5E` (Cinema Crimson), `--cta-bg: #FFFFFF` / `--cta-fg: #060608`. Gradients use progressive `@supports` `--in-oklab` (`in oklab` with empty fallback preamble).
3. **Typography**: Body `'Be Vietnam Pro'` (`1.55` line-height), Mono telemetry `'JetBrains Mono'`.
4. **Display Font**: `'Space Grotesk'` (`-0.03em` tight editorial display tracking).
5. **Layout Model**:
   - Full-bleed Ambient Cinema Hero (`#spotlightHeroShell`) kept permanently mounted (`0px` filter scroll jump).
   - Direct transition to Catalog `#catalogSection` (zero middle carousels):
     - **Option B Horizontal Sticky Command Dock (`#commandDock`)**: Quick scopes (`Tất Cả`, `Mới 24h`, `Bảng XH`, `Cày Đêm >6h`, `Series Dài`, `Phim 1 Tập`, `Tủ Phim`) + result count + Sort & Timeframe selects.
     - **Option A Sticky Left Attribute Sidebar (`248px`, `#appSidebar`)**: `Thể Loại 3D` with tabular mono counts, `Thời Lượng` chips, `Nguồn Studio` popover trigger. Collapses into native Popover `#mobileFilterDrawer` at `<= 1024px`.
     - **Right 3-Column Cinema Grid (`#cardsWidescreenGrid`)**: Clean 16:9 posters, concise mono metadata, hover-reveal bottom strip (`Xem Tập 1` + `Chi Tiết`), locked `min-height: 780px; overflow-anchor: none;`.
6. **Component Style**: `10px` card radius, `6px` crisp button radius, `>= 44px` hero CTAs, native `popover="auto"` Studio Directory & Filter Drawers.
7. **Mood & Vibe**: Obsidian Cinema Screening Room (Apple TV+ / Criterion / MUBI restraint).
8. **Density**: 4 / 10 (Airy 3-column 16:9 gallery frames paired with scannable tabular metadata).
