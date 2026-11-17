---
name: Cozy Mint Oasis
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  currency-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  currency-card:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system crafts a sanctuary for personal wealth management, transforming anxiety-driven budgeting into a restorative, playful ritual. Designed specifically for native mobile experiences in the Vietnamese market, it blends a calming "aquarium sanctuary" narrative with gentle habit loops and rewarding micro-interactions.

### Brand Personality & Emotional Tone
- **Nurturing & Gentle:** Eliminates the punitive visual language of standard banking. Financial tracking feels like caring for a personal desktop terrarium or pocket aquarium.
- **Rewarding & Cheerful:** Celebrates conscious spending, steady saving streaks, and small daily check-ins through luminous badges, dynamic aquatic metaphors, and warm haptic feedback.
- **Trustworthy & Pristine:** Balances playfulness with financial rigor. Currency figures (₫ / VND) and data visualizations are authoritative, legible, and uncluttered.

### Visual Style
A harmonious fusion of **Cozy Tactile Minimal** and **Soft Glassmorphism**:
- Generous, organic squircles (`rounded-2xl` through `rounded-3xl`).
- Warm, luminous off-white backdrops overlaid with crisp paper-white cards.
- Deep, low-saturation aquatic tints with radiant mint and golden streak highlights.
- Soft, pillowy micro-elevations that invite touch without visual heaviness.

## Colors

The color palette anchors the financial interface in calm natural tones, using distinct functional accents for status, rewards, and expenditures.

### Core Roles
- **Primary Accent (Mint Oasis - `#10B981` / `#059669`):** Represents growth, savings progress, deposit balance gains, and primary interactive calls to action.
- **Secondary Accent (Deep Aquatic Teal - `#0D9488` / Water Mist `#38BDF8`):** Applied to portfolio tracking, safe-to-spend categories, insights, and interactive navigation tabs.
- **Tertiary Accent (Golden Sand - `#F59E0B`):** Reserved exclusively for gamified achievements, streak counters, golden coins, and leveling milestones.
- **Expense & Outflow Accent (Coral Rose - `#F43F5E`):** A soft, non-punitive coral dedicated to debt, alert prompts, negative delta changes, and daily expense tallies.
- **Background Canvas:** Soft warm cream (`#F9FAF8`) transitioned to layered section wells (`#F3F4F1`).
- **Surface Layer:** Pristine solid white (`#FFFFFF`) to ensure maximum contrast and crispness for financial legibility.
- **Typography & Structure Neutral:** Balanced slate neutral (`#1E293B` for high-emphasis headings, `#64748B` for secondary meta text and currency markers).

## Typography

Typography prioritizes Vietnamese diacritical legibility, natural conversational tone, and visual clarity across financial sums.

### Pairing Strategy
- **Headlines & Financial Totals (Plus Jakarta Sans):** Offers geometric friendliness, sculpted modern curves, and punchy numbers that keep financial balances friendly yet prominent.
- **Body, Inputs & Micro-copy (Be Vietnam Pro):** Engineered specifically for Vietnamese tone marks and glyph nuances, ensuring that complex vowel combinations never clip, crowd, or distort at compact sizes.

### Typography Guidelines
- **Vietnamese Currency (VND / ₫):** Always style the currency symbol (`₫` or `đ`) as a superscript or secondary-weighted suffix (`label-lg` or `body-md`) adjacent to the bold figure (`currency-display` or `currency-card`) to emphasize numeric value.
- **Tabular Figures:** Always apply `font-variant-numeric: tabular-nums` across all numeric displays, transaction tables, and countdown clocks to eliminate horizontal jitter when values increment dynamically.

## Layout & Spacing

The layout is optimized for single-thumb mobile interaction within safe screen boundaries.

### Layout Model
- **Grid Structure:** Fluid 4-column layout on standard mobile widths (360px - 428px), widening to an adaptive 8-column layout on foldable devices and compact tablets.
- **Margins & Safe Insets:** 
  - Standard edge margin of `1.25rem` (`20px`).
  - Top edge margin accounts for the status bar and dynamic island (+ `1rem` safe clearance).
  - Bottom edge margin reserves `5.5rem` (`88px`) to float smoothly above the bottom navigation bar and home indicator.

### Rhythm & Vertical Cadence
- **Component Stacking:** Stack primary transaction clusters, gamified aquarium widgets, and category cards using `space-md` (`12px`) to `space-lg` (`20px`) vertical gaps.
- **Internal Padding:** Cards utilize `space-lg` (`20px`) on desktop/tablet views and `1rem` to `1.25rem` on compact devices to preserve touch-target real estate without suffocating visual breathability.

## Elevation & Depth

This system avoids harsh drop shadows and artificial skeuomorphism in favor of soft, atmospheric warmth reminiscent of sunlight filtering into shallow ocean water.

### Depth Hierarchy
1. **Base Layer (Canvas):** Warm cream foundation (`#F9FAF8`) grounding the viewport.
2. **Surface Containers (Level 1):** Solid white card containers (`#FFFFFF`) with ultra-diffused micro-shadows:
   - `box-shadow: 0 4px 20px -2px rgba(13, 148, 136, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02);`
3. **Floating Interactive Elements (Level 2):** Floating Action Buttons (FAB), streak counters, and reward modals:
   - `box-shadow: 0 10px 28px -4px rgba(16, 185, 129, 0.18), 0 4px 10px -2px rgba(16, 185, 129, 0.08);`
4. **Frosted Overlays (Glassmorphic Sheen):**
   - Translucent navigation bar, contextual filters, and bottom sheets use `background: rgba(255, 255, 255, 0.82)` coupled with `backdrop-filter: blur(16px)` and an interior hairline rim of `rgba(255, 255, 255, 0.6)`.

## Shapes

The design language is defined by warm, organic squircle geometries (`roundedness: 3`) that evoke pebble stones, bubbles, and friendly touchable objects.

### Shape Hierarchy
- **Standard Cards & Modals:** `rounded-3xl` (`24px` to `32px` on mobile screens) creates an approachable, pillowy framing for financial summaries and aquarium terrarium viewports.
- **Buttons, Badges & Chips:** Full pill contouring (`rounded-full`) for quick actionable triggers, transaction filters, and streak pills.
- **Inputs & Interactive Form Fields:** Large squircle bounds (`rounded-2xl` / `16px`) ensure comfortable tapping regions for numeric keypad entry.

## Components

### Buttons
- **Primary Action (Mint CTA):** Solid `#10B981` background with white text, full pill curvature, `48px` minimum height, and subtle tactile compression on active state (`transform: scale(0.98)`).
- **Secondary (Aquatic Outline / Tint):** Translucent mint/teal fill (`rgba(16, 185, 129, 0.10)`) with bold teal text (`#0D9488`).
- **Streak & Reward Button:** Golden amber gradient (`#F59E0B` to `#D97706`) with dual-color drop shadow for coin-redemption and milestone claims.

### Chips & Filter Pills
- Pill-shaped tags with `32px` height. Inactive chips display a light cream-slate border with muted text (`#64748B`). Active chips transition to a soft mint pill (`#ECFDF5`) with emerald text (`#059669`) and an inline icon.

### Financial Summary Cards
- Rounded `28px` card structures in `#FFFFFF`. Header contains category avatar enclosed in a soft pastel circular badge, followed by the transaction name, relative time, and monetary value formatted with color-coded markers (`#10B981` for income, `#F43F5E` for expenses).

### Inputs & Keypads
- Amount input fields are centered with large `currency-display` sizing, subtle zero-state ghosting, and a persistent `₫` tag. Numerical soft-keypads feature pillowy squircle keys with immediate tactile touch ripples.

### Checkboxes & Toggle Switches
- Custom bubble switches: Track uses `rounded-full` in muted gray (`#E2E8F0`), transitioning into vivid Mint `#10B981` on activation. The circular thumb features a micro-drop shadow to convey physical depth.

### Gamified Aquarium Progress Widgets
- **Habit Progress Bar:** Cylindrical capsule tracker filled with an animated gradient imitating moving water (`#38BDF8` to `#10B981`).
- **Streak Bubble:** Compact golden pill featuring a flame or coin glyph, displaying consecutive tracking days with high-contrast amber styling.