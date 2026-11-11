# Brand & Design System: Hôm Nay Xem Gì (Nordic Minimalist Pure Glass)

> Version: 4.0.0 (Official Production Release)  
> Aesthetic Persona: Nordic Minimalist Pure Glass (Bắc Âu Tối Giản & Kính Mờ)  
> Core Philosophy: Breathable space, frosted glass materiality, crystal-clear typography, and zero visual clutter.

---

## 1. Executive Summary & Design Read
- **Product Kind**: Curated anime, donghua, and animated film streaming platform for 1,564 films across 8 YouTube channels.
- **Design Read**: `Reading this as: High-craft Scandinavian streaming curation platform ("Hôm Nay Xem Gì") for donghua and anime enthusiasts, with an Arctic Slate & Glacier Ice Blue language, leaning toward Nordic Minimalist Pure Glass aesthetic.`
- **Target Audience**: Film binger and donghua lovers seeking high-quality multi-hour recaps without clutter.
- **Anti-Patterns Strictly Avoided**:
  - No generic AI SaaS dashboard widgets, no KPI metric bars, no pulse-dot eyebrow kickers.
  - No low-contrast text (specifically: no white-on-white badges).
  - No stretched or pixelated thumbnails (strictly 16:9 widescreen `aspect-video`).
  - No emoji as UI icons (strictly official SVG Lucide iconography).

---

## 2. Color Palette & Semantic Tokens

### Canvas & Surfaces
- **Canvas Root (`--bg-canvas`)**: `#0B0D11` (Deep Arctic Slate)
- **Surface Glass (`--bg-surface`)**: `rgba(255, 255, 255, 0.035)` with `backdrop-filter: blur(20px)`
- **Surface Elevated (`--bg-surface-elevated`)**: `rgba(255, 255, 255, 0.065)`
- **Surface Hover (`--bg-surface-hover`)**: `rgba(255, 255, 255, 0.095)`
- **Frosted Capsule Pill**: `rgba(11, 15, 23, 0.88)` with `backdrop-filter: blur(8px)`

### Primary Accents (< 10% Surface Area)
- **Glacier Ice Blue (`--accent-primary`)**: `#38BDF8` (Sky 400 - high-energy, calm, crisp)
- **Glacier Glow (`--accent-glow`)**: `rgba(56, 189, 248, 0.25)`
- **Amber Gold (`--accent-amber`)**: `#F59E0B` (Used for duration clock & hot badge)
- **Crimson Heart (`--accent-heart`)**: `#EF4444` (Used for favorite bookmarks)

### Text & Contrast Hierarchy (WCAG AAA Compliant)
- **Primary Text (`--text-primary`)**: `#F8FAFC` (Pure Frost White, contrast > 14:1 against canvas)
- **Secondary Text (`--text-secondary`)**: `#CBD5E1` (Slate 300)
- **Muted Text (`--text-muted`)**: `#94A3B8` (Slate 400, clear & legible)
- **Border Subtle (`--border-subtle`)**: `rgba(255, 255, 255, 0.07)`
- **Border Strong (`--border-strong`)**: `rgba(56, 189, 248, 0.35)`

---

## 3. Typography & Typescale

### Font Family
- **Single Master Font**: Google Font `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
  - Selected for flawless Vietnamese diacritics, geometric balance, and clean legibility.

### Hierarchy
| Element | Font Size | Weight | Line Height | Color |
|---|---|---|---|---|
| Page / Brand Title | 20px (1.25rem) | 800 | 1.2 | `#F8FAFC` |
| Section / Box Headers | 13px (0.8125rem) | 800 | 1.2 | `#38BDF8` (Uppercase) |
| Film Card Title | 16px (1.0rem) | 700 | 1.45 | `#F8FAFC` (Hover: `#38BDF8`) |
| Parts Badge ("Trọn bộ / N phần") | 12px (0.75rem) | 700 | 1.0 | `#38BDF8` on Dark Frosted |
| Duration Badge ("13h 51m") | 12px (0.75rem) | 600 | 1.0 | `#F8FAFC` on Dark Frosted |
| Channel & Metadata | 13px (0.8125rem) | 600 | 1.4 | `#38BDF8` & `#94A3B8` |

---

## 4. Component Geometry & Spacing
- **Border Radii**:
  - Cards: `22px`
  - Badges & Pills: `9999px` (Full round capsules)
  - Search & Inputs: `16px`
  - Modal Dialogs: `24px`
- **Card Thumbnail**: Strictly 16:9 widescreen (`aspect-ratio: 16 / 9`) with `overflow: hidden`.
- **Card Elevation**: `0 8px 30px rgba(0, 0, 0, 0.35)`, hover `0 14px 40px rgba(56, 189, 248, 0.16)`.
- **Micro-interactions**: 200–250ms `cubic-bezier(0.16, 1, 0.3, 1)`.
