# Clawgency Frontend Update — Complete Changelog

> **Date:** 12 February 2026  
> **Stack:** Next.js 14 · React · Framer Motion · Tailwind CSS · RainbowKit · wagmi

---

## 1. Design System — Glassmorphism Foundation

### Global Styles ([globals.css](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/app/globals.css))

A full design system was implemented as the CSS foundation for the entire app:

| Token | Purpose |
|---|---|
| `.glass` | Standard glassmorphism — `rgba(255,255,255,0.55)` + 20px blur |
| `.glass-strong` | Heavier variant — `rgba(255,255,255,0.85)` + 30px blur |
| `.glass-card` | Cards with white background, subtle border, and soft shadow |
| `.shadow-glow-indigo` | Indigo ambient glow for key elements |
| `.shadow-glass-hover` | Elevated glassmorphism shadow on hover |

**Typography:** Clash Display (headings) + Satoshi (body) loaded from CDN.  
**Background:** Solid `#eef0ff` lavender-tinted base.  
**RainbowKit Overrides:** Custom CSS within `.rainbow-btn-wrapper` ensures the wallet connect button matches the glassmorphism theme with indigo gradients, 12px border radius, and Satoshi font.

---

## 2. Homepage — Cinematic Visual Storytelling

### File: [page.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/app/page.tsx)

The homepage was completely redesigned from feature cards into a cinematic, visual storytelling experience.

### 2.1 Hero Illustration Section

- **Central image:** `/ee.png` displayed as the full-width hero visual (max 900px)
- **AI pulse glow:** Dense purple radial gradient behind the robot, pulsing with Framer Motion (`scale: [1, 1.06, 1]`, `opacity: [0.5, 0.85, 0.5]`)
- **Particle ring:** Animated rotating ring of gradient dots around the illustration center
- **Arrow light travel:** A glowing indigo dot that travels along a dashed SVG path with a trailing glow filter
- **Cloud fade-ins:** Two glassmorphism speech-bubble elements that fade in/out cyclically
- **Checkmark bounce:** Animated checkmark icon that bounces in with spring physics
- **Floating BNB coins:** Two BNB coin images (`what-is-bnb-and-bnb-smart-chain_new.webp`) positioned left and right, floating with gentle vertical animation

### 2.2 Decorative Margin Images

Two images placed in the page's left and right blank margins (visible on `xl:` screens):

- **Left margin:** `/456.png` — rounded, with drop shadow
- **Right margin:** `/clawbot.png` — rounded, with drop shadow

Positioned using `absolute` within a full-width wrapper to avoid `overflow-hidden` clipping.

### 2.3 "How Clawgency Works" Section

#### Typewriter Heading Component

A custom `TypewriterHeading` component renders "AI Meets Escrow for / Influencer Campaigns" with:

- **Character-by-character typing** at 70ms intervals
- **Scroll-triggered start** via Framer Motion's `useInView` hook (fires once)
- **Blinking cursor** — 3px indigo bar blinking at 530ms intervals
- **Gradient text** — Line 1: `gray-900 → indigo-800 → gray-900`; Line 2: `indigo-700 → violet-600 → indigo-700`
- **Subtitle fade-in** after typing completes (3.5s delay)

#### Three-Step Process Cards

| Step | Title | Color |
|---|---|---|
| 01 | Create Campaign | Indigo `#6366f1` |
| 02 | AI Orchestrates | Violet `#8b5cf6` |
| 03 | Secure Payout | Emerald `#10b981` |

Each card uses `.glass-card` with colored step badges and hover shadow transitions.

#### Key Highlights

Two-column grid with "Why On-Chain Escrow?" and "AI-Native Workflow" explanations inside a single `.glass-card` container.

---

## 3. Navigation — Sidebar & Role Switching

### File: [NavSidebar.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/components/NavSidebar.tsx)

### 3.1 Sidebar Design

- **Glass background:** `.glass-strong` with right-side rounding (`rounded-r-3xl`)
- **Slide-in/out:** CSS `translate-x` transition (300ms ease-out)
- **Mobile backdrop:** `bg-black/20` + `backdrop-blur-sm` overlay, dismisses on tap
- **Logo area:** `/123.png` with indigo glow shadow + "Clawgency" in Clash Display + "AI AGENCY PLATFORM" subtitle

### 3.2 Role Switcher

Pill-style toggle between **Brand** (indigo), **Creator** (emerald), **Admin** (amber):

- Active pill fills with the role's color, white text
- Inactive pills show gray text with hover effect
- Admin pill hidden unless wallet matches `NEXT_PUBLIC_ADMIN_WALLET`

### 3.3 Nav Items with Auto Role Switching

Each nav item that implies a role (`Brand → brand`, `Creator → influencer`, `Admin → admin`) now **automatically switches the session role** when clicked. This eliminates the "Wrong Role" error when navigating to role-guarded pages.

```tsx
{ href: "/brand/dashboard", label: "Brand", icon: LayoutDashboard, impliedRole: "brand" }
```

On click, if the `impliedRole` differs from the current role, `setRole()` is called before navigation.

### 3.4 Wallet Section

Glassmorphism wallet card at the bottom of the sidebar:

- Wallet icon in indigo-tinted badge
- Live connection status indicator (green dot with glow)
- RainbowKit `ConnectButton` wrapped in `.rainbow-btn-wrapper` for custom styling

---

## 4. Session Context — Role Management Fix

### File: [SessionContext.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/context/SessionContext.tsx)

**Bug fixed:** The `setRole` function was a plain arrow function recreated every render but excluded from `useMemo` dependencies. This caused consumers to receive a stale function reference, making role switching silently fail.

**Fix:**
- Wrapped `setRole` in `useCallback(…, [])` for a stable identity
- Added `setRole` to the `useMemo` dependency array

---

## 5. Brand Dashboard

### File: [brand/dashboard/page.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/app/brand/dashboard/page.tsx)

### 5.1 Stats Grid

Four glassmorphism stat cards in a responsive 2×2 / 4-column grid:

| Stat | Icon | Color | BNB Coin |
|---|---|---|---|
| Active | BarChart3 | Indigo | No |
| Budget | Coins | Violet | ✅ Yes |
| Escrowed | Wallet | Emerald | ✅ Yes |
| Ready | Zap | Amber/Gray | No |

Stats with BNB values use the `BnbValue` component to show the gold coin image inline.

### 5.2 Campaign Creation Form

Glassmorphism form with:
- Influencer address input
- Budget (BNB) input
- AI-powered brief drafting via "Draft with AI" button
- Milestone configuration with comma-separated amounts
- `ContractButton` for on-chain deployment

### 5.3 Campaign List

Each campaign rendered as a `CampaignCard` inside a glassmorphism wrapper with action buttons for deposit, approve, and release milestone operations.

---

## 6. Creator Hub (Influencer Dashboard)

### File: [influencer/dashboard/page.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/app/influencer/dashboard/page.tsx)

Complete redesign from HeroUI cards to the glassmorphism system:

### 6.1 Header

Violet sparkle icon badge + "Creator Hub" in Clash Display + "Submit proofs & track milestones" subtitle.

### 6.2 Stats Row

Three glassmorphism stat cards:

| Stat | Icon | Color |
|---|---|---|
| Active Gigs | Clock | Indigo |
| Needs Proof | AlertCircle | Amber |
| Pending | CheckCircle | Emerald |

### 6.3 Tasks Section

- **Loading state:** Centered spinner with "Loading campaigns…" text inside a glass card
- **Empty state:** Centered Zap icon in violet badge + "No active campaigns" heading + help text
- **Campaign cards:** Each wrapped in a `.glass-card` container
- **Proof Uploader:** Indented with indigo left border (`border-l-2 border-indigo-100`), Upload icon badge, wrapped in a glass card

---

## 7. Campaign Card Component

### File: [CampaignCard.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/components/CampaignCard.tsx)

Designed as a reusable component used across Brand Dashboard, Creator Hub, and Explore Campaigns pages.

### Card Sections

| Section | Content |
|---|---|
| **Header** | Campaign ID badge + Status pill (color-coded) + Total Value with BNB coin |
| **Parties** | Brand and Creator wallet addresses (shortened) in bordered cards |
| **Progress** | Labeled progress bar with percentage, color matches campaign state |
| **Financials** | Escrowed amount (amber/emerald) + Released amount, both with BNB coin images |
| **Milestones** | Numbered badges (green=paid, indigo=approved, gray=pending) + action slot |

### State Color Mapping

| State | Color | Icon |
|---|---|---|
| Created | Indigo `#6366f1` | Clock |
| Funded | Emerald `#10b981` | Wallet |
| Completed | Violet `#8b5cf6` | CheckCircle2 |
| Cancelled | Red `#ef4444` | XCircle |

---

## 8. BnbValue Component

### File: [BnbValue.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/components/BnbValue.tsx)

Reusable inline component that displays BNB amounts with the gold coin image (`/1839.png`):

```tsx
<BnbValue amount="1.0000 BNB" />
// Renders: "1.0000" + 🪙 (coin image)
```

- Strips the trailing " BNB" text and replaces it with the coin image
- Coin image sized to `1em` for consistent scaling with any font size
- Used in: `CampaignCard`, Brand Dashboard stats

---

## 9. Role Guard Component

### File: [RoleGuard.tsx](file:///c:/Users/aryan/clawgency-slot2-professional/frontend/components/RoleGuard.tsx)

Wrapper that checks the current session role against an allowed list:

- Shows the page content if the role matches
- Shows a warning card with "Wrong Role" message if it doesn't
- Displays both the required role and current role for clarity

---

## 10. File Summary

| File | Action | Description |
|---|---|---|
| `app/globals.css` | Modified | Design system + RainbowKit overrides |
| `app/page.tsx` | Rewritten | Cinematic homepage with animations |
| `app/brand/dashboard/page.tsx` | Modified | Glassmorphism stats + BNB coin images |
| `app/influencer/dashboard/page.tsx` | Rewritten | Full glassmorphism redesign |
| `components/NavSidebar.tsx` | Modified | Auto role switching + glass sidebar |
| `components/CampaignCard.tsx` | Modified | BNB coin images inline |
| `components/BnbValue.tsx` | **New** | Reusable BNB value + coin component |
| `context/SessionContext.tsx` | Modified | Fixed stale `setRole` reference |

---

## 11. Dependencies Used

| Package | Purpose |
|---|---|
| `framer-motion` | All homepage animations (pulse, particles, typing, fade-ins) |
| `lucide-react` | Icon system across all components |
| `@rainbow-me/rainbowkit` | Wallet connection UI |
| `wagmi` + `viem` | Blockchain interaction + formatting |
| `react-hot-toast` | Toast notifications |
| `next` | App router, font loading, image optimization |

---

## 12. Static Assets Used

| File | Usage |
|---|---|
| `/ee.png` | Homepage hero illustration |
| `/123.png` | Sidebar logo |
| `/456.png` | Left margin decorative image |
| `/clawbot.png` | Right margin decorative image |
| `/1839.png` | BNB gold coin (inline with amounts) |
| `/what-is-bnb-and-bnb-smart-chain_new.webp` | Floating BNB coins on homepage |
