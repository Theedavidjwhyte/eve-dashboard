# E.V.E — Elevate Value Add Engine — AGENTS.md

## Project Overview
E.V.E is a **sales pipeline intelligence dashboard** built for a sales leadership team managing ~5 Account Directors (ADs). It ingests Salesforce CSV exports and provides deep analysis across OI (Opportunity Intelligence) pipeline, ARR (Annual Recurring Revenue), budget tracking, forecasting, and deal qualification.

**Key terminology:**
- **Split ABC** (`ABC Split Value` SF field → `_val`) = **OI** — the AD's individual split share of a deal, used for OI pipeline targets
- **Total ABC** (`Total ABC` SF field → `_abc`) = **ARR** — the full deal value, used for ARR tracking
- There is **no field called "Values"** — always use Split ABC (OI) or Total ABC (ARR)

There is **no backend** — it is a pure React + Vite SPA with Supabase as its database.

**The app is password-protected.** Password: `Elevate2026` (stored in `localStorage` key `eve_auth`).

---

## Tech Stack
- **React 19** + **Vite** (TypeScript, `"type": "module"`)
- **Zustand** (with `persist` middleware via `localStorage`) — global state store
- **Supabase** (`@supabase/supabase-js`) — cross-device sync, no auth beyond password gate
- **Recharts** — all charts
- **Tailwind CSS** + **shadcn/ui** (Radix primitives) — UI components in `src/components/ui/`
- **Papaparse** — CSV parsing for Salesforce imports
- **pptxgenjs** — PowerPoint export
- **date-fns** — date utilities
- **Lucide React** — icons
- **No backend server** — pure SPA

---

## Directory Structure
```
frontend/
  src/
    App.tsx                  # Root: layout, tab routing, modal wiring
    main.tsx                 # Vite entry point
    globals.css              # Tailwind base + CSS variables (dark theme)
    types/index.ts           # All shared TypeScript types
    store/
      dashboardStore.ts      # Single Zustand store — ALL app state & actions
    config/
      users.ts               # USERS array, BUDGET_AD_KEYS, BUDGET_AD_MAP
      months.ts              # MONTHS, QUARTERS, QUARTER_FOR_MONTH, HALVES, FY_MONTH_KEYS
      budgets.ts             # DEFAULT_OI_TARGETS, DEFAULT_ARR_TARGETS
      products.ts            # PRODUCTS array for product detection
      elvAccounts.ts         # ELV_ACCOUNTS reference data (account → ELV ID mapping)
      arrBaseData.ts         # DEFAULT_ARR_BASE_DATA
      avatars.ts             # Avatar mappings per user
    lib/
      enrichRow.ts           # Transforms raw SF deal → adds _prefixed computed fields
      formatters.ts          # parseMoney(), fmt(), formatK(), etc.
      dateParser.ts          # parseSalesforceDate() — handles SF date formats
      analysisEngine.ts      # Powers QuickAsk AI overlay (rule-based, no LLM)
      syncService.ts         # All Supabase read/write functions (safe when unconfigured)
      supabase.ts            # Supabase client initialisation
      arrImport.ts           # ARR CSV parsing + dedup logic
      accountMatch.ts        # Account → AD matching logic + DEFAULT_ACCOUNT_MATCH
      budgetHelpers.ts       # deriveMonthlyBudget()
      insights.ts            # OI insights engine
      servicesInsights.ts    # Services pipeline insights
      exportHelpers.ts       # CSV/Excel export helpers
      exportPPTX.ts          # PowerPoint export
      celebrationBuilder.ts  # Win celebration messages
      utils.ts               # cn() (classnames helper)
    hooks/
      useSync.ts             # Supabase sync hook (status, lastSynced, refresh)
    components/
      AppContainer.tsx
      auth/                  # (auth helpers if any)
      layout/
        PasswordGate.tsx     # Password: "Elevate2026" — wraps entire app
        Sidebar.tsx          # Left nav — tab switching
        TopBar.tsx           # Top bar with import + QuickAsk + sync status
        FiltersBar.tsx       # Filter strip (month, user, quarter, product, group)
        TabBar.tsx
        Header.tsx
        SyncIndicator.tsx
      tabs/                  # One file per main tab (20+ tabs)
      panels/
        DealQualifyPanel.tsx # MEDDPICC deal qualification panel
      modals/
        ImportDataModal.tsx  # CSV import flow
        DealDetailModal.tsx  # Deal drill-down (triggered via event bus)
        QuickAskOverlay.tsx  # Ctrl+K AI overlay (rule-based analysis)
        ADCardModal.tsx      # Account Director card
      shared/
        EmptyState.tsx       # Shown when no data loaded
      blocks/                # Reusable UI building blocks
      ui/                    # shadcn/ui components — DO NOT modify
```

---

## Core Data Model

### `Deal` type (`src/types/index.ts`)
Raw Salesforce columns are plain strings. Computed fields are added by `enrichRow()` and prefixed with `_`:

| Field | Description |
|---|---|
| `_stageSummary` | `"Won" \| "Lost" \| "Pipe"` |
| `_month` | Close month abbreviation e.g. `"Jul"` |
| `_val` | Parsed `ABC Split Value` (Split ABC) = **OI value** — the AD's split share |
| `_abc` | Parsed `Total ABC` = **ARR value** — full deal value |
| `_initials` | Parsed `Total Initials` |
| `_services` | Parsed `Services Amount` |
| `_push` | Push count as number |
| `_commit` | Commit status string |
| `_product` | Detected product from opportunity name |
| `_quarter` | e.g. `"Q1"` |
| `_createdDate` | JS Date from `Created Date` column |
| `_meddpicc` | MEDDPICC qualification score 0–100 |
| `_dealType` | `"OI and ARR" \| "OI Only" \| "ARR Only" \| "Churn" \| "Downsell"` |

### Fiscal Year Convention
- FY runs **Jul → Jun** (Jul = Month 1, Jun = Month 12)
- `MONTHS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"]`
- Q1 = Jul/Aug/Sep, Q2 = Oct/Nov/Dec, Q3 = Jan/Feb/Mar, Q4 = Apr/May/Jun
- **Always use `MONTH_NUM` from `config/months.ts` for ordering**, never alphabetical sort

### Users / ADs
Defined in `config/users.ts`:
- `USERS`: `["Chevonne Souness", "Dan Turner", "David Whyte", "James Roberts", "Samantha Backhouse"]`
- Budget keys: `CS, DT, DW, JR, SB, NM` (NM = New Team Member)

---

## Global State — Zustand Store (`store/dashboardStore.ts`)
Everything lives here. Key slices:

| Slice | Description |
|---|---|
| `data: Deal[]` | Imported OI pipeline deals (enriched) |
| `rawCsv: string` | Raw CSV string of last import |
| `manualDeals: Deal[]` | Manually added deals |
| `arrDeals: ARRDeal[]` | Imported ARR deals |
| `manualArrDeals: ARRDeal[]` | Manual ARR deals |
| `filters: Filters` | Active filters (month, user, quarter, product, group, keyDeals) |
| `currentTab: TabId` | Active tab |
| `notes: AllNotes` | Weekly notes per month/user/week |
| `freeNotes` | Free-text notes per month |
| `commitNotesTS` | Timestamped commit notes |
| `oiTargets / arrTargets` | Budget targets (user-editable) |
| `accountMatch` | Account → AD mapping reference data |
| `lostReviews` | Lost deal review records |
| `monthlyBudget` | Derived monthly OI budget (not persisted) |

The store is **persisted to `localStorage`** via Zustand `persist`. Supabase sync happens alongside for cross-device access.

---

## Tabs Reference
| TabId | File | Description |
|---|---|---|
| `insights` | `InsightsTab.tsx` | Overview insights dashboard |
| `deals` | `AllDealsTab.tsx` | Full deal table |
| `dealbreakdown` | `DealBreakdownTab.tsx` | Monthly/quarterly/YTD breakdown |
| `monthly` | `MonthlyTab.tsx` | Monthly pipeline view |
| `quarterly` | `QuarterlyTab.tsx` | Quarterly view |
| `ytd` | `YTDTab.tsx` | Year-to-date view |
| `closed` | `ClosedTab.tsx` | Won/Lost deals |
| `services` | `ServicesTab.tsx` | Services pipeline |
| `budget` | `BudgetTab.tsx` | Budget vs actuals |
| `accounts` | `AccountsTab.tsx` | Account-level view |
| `reports` | `ReportsTab.tsx` | Export/reports |
| `forecast-post` | `ForecastPostTab.tsx` | Forecast posting |
| `network` | `NetworkTab.tsx` | Network/relationship view |
| `pipeline-creation` | `PipeCreationTab.tsx` | Pipe creation tracking |
| `arr` | `ARRTab.tsx` | ARR main view |
| `arr-monthly` | `ARRMonthlyTab.tsx` | ARR by month |
| `arr-exempt` | `ARRExemptTab.tsx` | Exempt ARR deals |
| `arr-dupes` | `ARRDupesTab.tsx` | Duplicate ARR deals |
| `arr-ad` | `ARRADTab.tsx` | ARR by AD |
| `arr-insights` | `ARRInsightsTab.tsx` | ARR insights |

ARR tabs work **without OI data loaded**. All other tabs require data.

---

## Key Patterns

### Deal Modal Event Bus
To open `DealDetailModal` from any component:
```typescript
import { openDealModal } from "@/App"
openDealModal("Modal Title", deals)
```
Uses `window.dispatchEvent` with `"open-deal-modal"` event. Do NOT try to open the modal via state from deep components.

### QuickAsk Overlay
- Triggered by `Ctrl+K` or the floating button (bottom-right, only when data loaded)
- Rule-based analysis engine in `lib/analysisEngine.ts` — **no external LLM**
- Takes `{ data, filters, oiTargets, monthlyBudget }` and returns a string

### Filters
```typescript
interface Filters {
  month: string | string[]   // "All" or month abbr or array
  user: string | string[]    // "All" or AD full name or array
  quarter: string            // "All" | "Q1" | "Q2" | "Q3" | "Q4"
  product: string
  group: string
  keyDeals: boolean
}
```
Filters are applied inline in each tab — there is no centralised `getFilteredDeals()` utility; each tab filters `data` itself using the `filters` slice.

### Adding a New Tab
1. Create `src/components/tabs/NewTab.tsx`
2. Add `TabId` entry to `types/index.ts`
3. Import and add a `case` in `renderTab()` in `App.tsx`
4. Add a nav entry in `Sidebar.tsx`

### Money Formatting
Always use `fmt()` from `lib/formatters.ts` for currency display. `parseMoney()` converts SF strings to numbers.

### Date Parsing
Always use `parseSalesforceDate()` from `lib/dateParser.ts`. Salesforce exports dates in multiple formats — never use `new Date(string)` directly.

---

## Supabase
- **URL**: `https://zavbdlbssuurddmmknfs.supabase.co` (hardcoded, safe — anon key only)
- **Tables**: `eve_imports`, `eve_deals`, `eve_notes`, `eve_arr_deals`, `eve_arr_imports`, `eve_arr_dupes`, `eve_arr_exempt`, `eve_deal_qualifications`, `eve_manual_arr_deals`, `eve_forecast_posts`, and more — see `supabase_all_tables.sql`
- All Supabase calls go through `lib/syncService.ts` — **safe to call even if Supabase is down** (returns null/empty)
- The `getSupabase()` function in `lib/supabase.ts` returns null if client fails — always check for null before using

---

## Coding Conventions
- **TypeScript strict** — no `any` unless unavoidable, prefer `unknown`
- **Computed Deal fields** always prefixed with `_` (e.g. `_val`, `_month`)
- **Config constants** live in `src/config/` — never hardcode user names, months, or budgets inline
- **No CSS modules** — Tailwind utility classes only
- **Component files** are PascalCase; lib/config files are camelCase
- **shadcn components** in `src/components/ui/` — never modify these files
- **`cn()`** from `lib/utils.ts` for conditional classnames (wraps `clsx` + `tailwind-merge`)
- All Supabase writes also write to `localStorage` first (store is the source of truth)

---

## Development Commands
```bash
cd frontend
npm run dev        # Start dev server (port 5173)
npx tsc --noEmit   # Type-check without building
npm run lint       # ESLint (0 warnings allowed)
```

**Never run `npm run build`** — this breaks the preview environment.

---

## Known Gotchas
- **FY month ordering**: Never sort months alphabetically. Always use `MONTH_NUM` from `config/months.ts` for correct FY ordering (Jul=1, Jun=12)
- **Filters `user` field** can be `"All"`, a single string, or an array — always check `Array.isArray(filters.user)` before string operations
- **ARR tabs** don't need OI data; they're rendered before the `data.length === 0` empty state check in `App.tsx`
- **`enrichRow()`** mutates the deal object in place (adds `_` fields) — it does not return a new object
- **Password gate**: `PasswordGate` wraps the whole app. Password is `"Elevate2026"`. Cleared from localStorage via `useSignOut()` hook exported from `PasswordGate.tsx`
- **No backend**: There is no `.NET` or Node backend. All data processing is client-side
- **pptxgenjs exports** run in the browser — no server-side generation
