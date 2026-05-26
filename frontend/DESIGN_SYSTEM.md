# BytesDoc — UI/Design System Handoff

## 1. Project context

**What it is:** Document management system for the BYTES Student Council at MSU. Centralized PDF/DOCX archive with role-based access, archiving, and a full audit trail.

**Roles (4):** `chief_minister` (admin), `secretary`, `finance_minister`, `member`. Each role gets its own dashboard route (`/dashboard/admin`, `/dashboard/secretary`, etc.).

**Surface area:**
- Public: `/` (landing), `/login`, `/accept-invite`
- Authed: `/dashboard/admin`, `/dashboard/secretary`, `/dashboard/finance`, `/dashboard/member`

**Tone:** institutional, trustworthy, low-key serious. Not playful, not enterprise-cold. Think "a council tool that respects your time."

---

## 2. Tech stack & constraints

- **Framework:** Next.js 15.5 (App Router, RSC, `'use client'` per component)
- **React:** 19
- **Styling:** Tailwind CSS 3 (no UI library — Radix/shadcn NOT used)
- **State:** Zustand stores (`authStore`, `documentStore`, `userStore`, `activityStore`, `toastStore`, `confirmStore`, etc.)
- **Theming:** `next-themes` with `attribute="class"`, `defaultTheme="light"` — every component must support dark mode
- **Icons:** `lucide-react` (primary) + `react-icons/bs` (file-type icons only: `BsFiletypePdf`, `BsFiletypeDocx`)
- **Charts:** `recharts` (BarChart, LineChart), custom tooltip in `components/charts/ChartTooltip.tsx`
- **Fonts:** Inter (Google Fonts) wired as `--font-sans` CSS var
- **Anim:** Tailwind utilities + `animate-in fade-in slide-in-from-*` (tailwindcss-animate-style classes are in use)

**Hard constraints:**
- Must work in light AND dark mode — never ship a class chain without the `dark:` variants
- No new dependencies unless justified (project deliberately uses primitives + Tailwind)
- Keep file-type colors consistent: PDF = red `#dc2626`, DOCX = blue `#2563eb` (defined in `components/ui/FileTypeIcon.tsx`)
- Brand mark: `/public/byteslogo1.png`, always rounded-sm, paired with uppercase wordmark "BytesDoc" in `tracking-tighter` weight 700

---

## 3. Design tokens

### Colors (`tailwind.config.ts`)
```ts
primary:       '#1a1a1a'   // near-black — used for primary buttons, sidebar bg, headings
accent:        '#2a2a2a'   // primary hover state
surface:       '#f5f5f5'   // light-mode app bg
surface-dark:  '#0d0d0d'   // dark-mode app bg
border-subtle: '#e5e5e5'   // light-mode hairline borders
```

Plus the full Tailwind palette. Recurring semantic uses:
- **Success/positive:** `emerald-500/600` (light), `emerald-400` (dark)
- **Danger/error:** `red-500/600` (light), `red-400` (dark)
- **Info:** `blue-500/600` (light), `blue-400` (dark)
- **Warning/archive:** `amber-500/600`
- **Accent badges on KPI cards:** `blue | emerald | amber | violet` (recently added via `Card.accent` prop)

### Shadows
```ts
shadow-soft:     '0 2px 8px -2px rgba(0,0,0,0.06)'    // cards at rest
shadow-lift:     '0 4px 12px -4px rgba(0,0,0,0.15)'   // hover on cards
shadow-elevated: '0 12px 32px -12px rgba(0,0,0,0.35)' // modals, command palette
```

### Radii (de-facto convention)
- `rounded-md` — chips, inputs, kbd
- `rounded-lg` — buttons, toasts, smaller cards
- `rounded-xl` — KPI/chart cards, command palette
- `rounded-2xl` — landing-page hero feature tiles, welcome hero
- `rounded-full` — pill badges, avatar dots

### Typography
- **Headings:** Inter, weight `font-bold` / `font-extrabold`, `tracking-tight` (or `tracking-tighter` for wordmarks)
- **Body:** Inter regular, `text-sm` default in dense UI, `text-base` for paragraphs
- **UI eyebrows:** `text-xs` or `text-[10px]/[11px]`, `font-semibold uppercase tracking-wider` (or `tracking-widest`)
- **Numbers in stats:** always `tabular-nums`

---

## 4. Component inventory (`frontend/components/`)

### Primitive UI (`components/ui/`)
| Component | Notes |
|---|---|
| `Button` | 3 variants: `primary` (bg-primary), `secondary` (bg-gray-200/700), `danger` (bg-red-500). Built-in loading spinner (Loader2), `active:scale-[0.98]`, focus ring `ring-primary/40`. |
| `Card` | KPI card with title/value/icon/delta/sparkline. New `accent` prop: `'blue' \| 'amber' \| 'emerald' \| 'violet' \| 'slate'` — controls tinted icon badge + sparkline color. `hover:-translate-y-0.5 hover:shadow-lift`. |
| `Modal` | Centered, `bg-black/60 backdrop-blur-sm`, `max-w-2xl`, header + body. Close X top-right. No animation currently. |
| `ConfirmDialog` | Promise-based via `confirmDialog({ title, message, confirmLabel, variant })`. Two-button footer. |
| `CommandPalette` | Ctrl/Cmd+K. Search input + grouped items (`Pages`, `Actions`). Arrow nav + Enter. `shadow-elevated` + `rounded-xl`. |
| `Toast` (`ToastViewport`) | Top-right stack, 3 variants (success/error/info), color-coded ring + icon, `animate-in slide-in-from-right`. |
| `EmptyState` | Centered: rounded-full icon halo + title + description + optional action. |
| `Skeleton` | Just `animate-pulse rounded-md bg-gray-200/80 dark:bg-white/[0.06]`. |
| `FileTypeIcon` + `FileTypeBadge` + `fileTypeMeta()` | File-type aware. PDF→red, DOCX→blue, fallback→gray. Badge variant for inline use, icon variant for visual rows. |
| `ProfileModal` | Edit display name. |

### Layout
| Component | Notes |
|---|---|
| `DashboardLayout` | Sticky left sidebar (`#1a1a1a`, 220px on `lg`, off-canvas drawer below). Topbar: search-palette trigger (Ctrl+K kbd shown), theme toggle, mobile-only user pill. Active sidebar tab = `bg-white text-black` (full inversion). |

### Dashboard widgets (`components/dashboard/`)
`ActivityLogTable`, `AdministrationsPanel`, `ArchiveList`, `CategoriesPanel`, `DocumentSettingsPanel`, `DocumentTable`, `DocumentViewerModal` (uses mammoth.js for DOCX preview), `EventsPanel`, `FolderExplorer`, `UploadModal`, `UserTable`.

### Charts (`components/charts/`)
`BarChart`, `LineChart`, `ChartTooltip`. All theme-aware via `useTheme()`. Grid `rgba(0,0,0,0.06)` / `rgba(255,255,255,0.06)`, axis text `#6b7280` / `#9ca3af`, bars/lines `#1a1a1a` / `#e5e7eb`.

---

## 5. Screen inventory

### `/` Landing (`app/page.tsx`)
- Full-bleed photo bg (`/graybg1.jpg`) + black gradient overlay
- Centered hero: pill badge ("BYTES Student Council" with pulsing emerald dot), 8xl uppercase wordmark, subline, single Login CTA (white bg, dark text)
- 4-up feature grid below hero: dark glassy tiles (`bg-primary/80 backdrop-blur-md ring-1 ring-white/10`)
- Footer: copyright + email + GitHub link

### `/login` (`app/login/page.tsx`)
- Split layout (md+): left dark panel (`#1a1a1a`) with branding/features list + radial dot pattern + blurred orbs; right white form panel
- Form: email + password (with show/hide eye), error banner (red), `Sign in` primary button
- Mobile: stacks, dark panel hidden, logo shows above form

### `/dashboard/admin` (`app/dashboard/admin/page.tsx`)
Tabs: Dashboard · Documents · Archive · Document Settings · Users · Activity Logs.

**Dashboard tab (recently enhanced):**
- Navy gradient welcome hero (`from-[#0A2647] to-[#1E3A5F]`) with watermark FileText icon, "Browse Folders" + "View Statistics" CTAs
- **Always-visible KPI strip** — 4 Cards with accent prop (blue/emerald/amber/violet), sparkline on Recent Uploads
- Dashed-border "View detailed analytics" button reveals:
  - 2 chart cards with header chip (e.g. "Last 6 months") in `rounded-xl + shadow-soft + border` treatment
  - Recent Documents list (divided list, file-type colored left stripe, hover-revealed Download action)

**Other tabs:** Documents = `FolderExplorer` + Upload button. Archive = read-only FolderExplorer. Document Settings = manage categories/administrations/events. Users = invite + role management. Logs = filterable + CSV export.

### `/dashboard/secretary`, `/finance`, `/member` — similar structure, scoped permissions

---

## 6. Patterns & conventions

### Dark mode pairing — always specify both
```
bg-white               dark:bg-gray-800
text-gray-900          dark:text-white
text-gray-600          dark:text-gray-400
text-gray-500          dark:text-gray-400
border-border-subtle   dark:border-white/5
ring-black/5           dark:ring-white/10
hover:bg-gray-50       dark:hover:bg-white/[0.02]
```

### Focus rings
`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900`

### Motion vocabulary
- Card hover: `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift`
- Button press: `active:scale-[0.98]`
- Enter animations: `animate-in fade-in slide-in-from-top-4 duration-500` (or `slide-in-from-right` for toasts)
- Icon hover nudge: `transition-transform group-hover:translate-x-0.5` (or `translate-y-0.5`)

### Table header convention
`text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400` on `bg-gray-50/80 dark:bg-gray-900/40`

### Eyebrow/chip pattern
`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-2 py-1 rounded-full`

### `kbd` styling
`inline-flex items-center text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10`

---

## 7. Known rough edges (good targets for design polish)

1. **Sidebar active state is jarring** — full white-on-black inversion. A left accent rail with subtle bg tint would feel more modern (and matches the rest of the system better).
2. **Modal has no enter/exit animation** — feels abrupt. Other surfaces (toasts, summary section) animate; modals should too.
3. **Role pill is just `tracking-widest` text** — could be color-coded per role.
4. **Topbar lacks a primary action** — no "New" / quick-upload, no notifications surface.
5. **Tables (Document/User/Activity)** — each defines its own header styling slightly differently. A shared `DataTable` skeleton would unify them.
6. **Loading states** — `Skeleton` exists but isn't wired into the dashboard tabs; first paint shows empty zeros.
7. **Welcome hero** — strong but visually isolated from the KPI strip below. A connecting visual element (or seamless transition) could improve continuity.
8. **Empty states** — `EmptyState` exists but most tabs show plain "No results" text instead.
9. **Form inputs in modals** are styled inline (different from the login form's icon-prefixed inputs). A shared `Input` primitive would help.
10. **No avatar component** — user shows as text only; an initials-bubble would humanize the sidebar/topbar.

---

## 8. What NOT to break

- The brand wordmark style (uppercase, `tracking-tighter`, font-bold) — used everywhere
- Dark sidebar identity (`#1a1a1a`) — that's the brand's anchor color
- File-type color mapping (PDF red / DOCX blue) — used in viewers, badges, recent lists
- The `Card` API — already used across 4 dashboards
- Existing slash command and auth flows — UI only, no behavior changes
- Light mode as the default (do not flip)
