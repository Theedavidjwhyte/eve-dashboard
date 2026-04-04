---

## Capitalisation

- **Page titles, block/widget titles**: Title case, lowercase prepositions — e.g. *Reports by Department*, *Recent Activity in Your Account*
- **Everything else** (buttons, labels, badges, menu items, form fields, info pairs): Sentence case — e.g. *Save changes*, *Pending approval*, *Email address*

# Evo Design System — AI Component Guidelines

## Buttons

- **Default**: Main CTA, aim for 1 per view — Save, Create, Confirm
- **Secondary**: Supporting actions — Cancel, Back, Skip
- **Destructive**: Irreversible actions only — confirm before executing, use specific labels ("Delete care plan" not "Delete")
- **Outline**: Lighter Secondary — good for dense UIs and toolbars
- **Ghost**: Low-priority inline actions — Edit, Copy, More. Tooltip if icon-only
- **Link**: Navigation and inline text — breadcrumbs, "Learn more". Avoid in forms

**Sizes:** `sm` tables/toolbars · `default` forms/dialogs · `lg` onboarding  
**Icons:** Label where possible; icon-only fine for ×, ⋯, pencil, bin — always tooltip  
**Labels:** Specific over generic — "Save care plan" not "Submit"

---

## Button Group

Groups related action buttons into a connected unit.

- **Use for**: actions on the same subject, split buttons (primary + dropdown), input/select pairings, toolbars
- **Not for**: toggle/selection state — use `ToggleGroup` instead
- **Separators**: use `ButtonGroupSeparator` between buttons; not needed for Outline (already has border)
- Keep variants consistent within a group · add `aria-label` · if 4+ options, consider a dropdown instead

---

## Accordion

Progressive disclosure for optional or secondary content. Use sparingly — if most users need it, show it outright.

- **Use for**: optional details, advanced settings, FAQs, reducing noise on long pages
- **Avoid when**: content is critical to the task, there's only one panel, or you're just trying to fit more on the page
- **`single` mode**: one panel open at a time — use when panels are alternatives
- **`multiple` mode**: several open at once — use when users may need to compare panels
- Headers must be descriptive enough to decide whether to open — avoid "More info" or "Details"
- Don't nest accordions · don't put full forms inside them

---

## Alert

Inline feedback about the state of a page, form, or process.

- **`destructive`**: Errors or critical failures
- **`warning`**: Potential issues to be aware of before proceeding
- **`information`**: Neutral notices or guidance
- **`success`**: Confirmation an action completed — commonly shown at the top of a page after saving
- **`default`**: Rarely used — prefer a semantic variant
- **`size="compact"`**: For inline or space-constrained contexts (inside cards, forms, smaller UI areas)
- Don't use for transient feedback — use Toast/Sonner instead

---

## Alert Dialog

A blocking modal that forces a decision before the user can continue. Use when an action is irreversible or high-risk.

- Always use for destructive confirmation — "Are you sure you want to delete this?"
- Provide a clear Cancel and a clearly labelled confirm action (use Destructive button variant for dangerous confirms)
- Keep copy short — state what will happen, not just "Are you sure?"
- Don't use for non-destructive confirmations — use a Dialog or Toast instead
- Don't overuse — if triggered too often, users will dismiss without reading

---

## Avatar

Displays a user or entity image, with fallback to initials or a generic icon.

- Use initials fallback when an image isn't available — don't leave a broken image state
- Keep sizes consistent within the same context (e.g. all avatars in a list should match)
- Add `alt` text or `aria-label` for accessibility

---

## Badge

A small label for status, category, or count. Purely informational unless `onClose` is used.

- **`default`** / **`secondary`** / **`outline`**: General purpose labels, decreasing visual weight
- **`destructive`** / **`success`** / **`warning`** / **`info`**: Semantic status — accent colour applied automatically
- **`accent`**: Custom colour (outline style) — set `accent` prop to one of: `teal`, `purple`, `nile`, `cerulean`, `lagoon`, `eagle`, `sap`, `orange`, `brick`, `red`, `violet`, `blue-violet`
- **`solid`**: Same accent colours, filled style
- **`onClose`**: Makes badge dismissible — use for filter chips or removable tags
- Keep text 1–2 words · use same variant/accent for the same status everywhere · don't rely on colour alone

---

## Breadcrumb

Shows the user's location within a hierarchy and lets them navigate back up.

- Use on pages that are 2+ levels deep in a navigation hierarchy
- Always reflect the actual page structure — don't invent levels
- The current page should appear as the last item and not be a link
- Don't use on top-level pages or flat navigation structures

---

## Card

A contained surface for grouping related content or actions.

- Use to visually separate distinct pieces of content on a page (e.g. a list of records, a summary panel)
- Keep card content focused — one topic per card
- Cards can contain buttons, but be intentional about which button variant fits the card's weight
- Don't nest cards inside cards

---

## Checkbox

For multi-select lists or single boolean options.

- Checked = on, enabled, or included — don't frame checked state as removing or revoking something
- Always pair with a visible label · group related checkboxes under a clear heading
- Only one option selectable? Use Radio Group · immediate on/off? Consider Switch

---

## Overlays & Panels

All four keep the user in context without a full page navigation. Choose based on content size and device.

| Component   | Best for                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Popover** | Compact interactive content anchored to a trigger — filters, quick edits, previews. Use when page context needs to remain visible |
| **Dialog**  | Short, focused tasks — small forms, confirmations, detail views. Blocks interaction with the page behind it                       |
| **Sheet**   | Longer forms or workflows too big for a Dialog. Slides in from the side, keeping the page partially visible                       |
| **Drawer**  | Mobile/touch flows — slides up from the bottom as a bottom sheet                                                                  |

- Always provide a way to dismiss
- Don't use Dialog or Drawer for destructive confirmations — use Alert Dialog
- Don't open an overlay from within another overlay
- Dialogs should be simple and focused — no scrolling content, no tabs, no complex navigation. If it needs that, use a Sheet
- Dialogs support `sm` / `md` sizes — use the smallest that fits the content comfortably
- Sheets support `sm` / `md` / `lg` — if you need larger, it should probably be a page
- If a Sheet is taking up most of the screen, it should probably be a page

---

## Dropdown Menu

A menu that appears on click, offering a list of actions or options related to a trigger element.

- Use for contextual actions on an item — e.g. Edit, Duplicate, Archive, Delete
- Use when you have more actions than can fit as visible buttons
- Group related actions with separators; put destructive actions (Delete) last, visually separated
- Don't use for navigation between pages — use Navigation Menu instead
- Don't use when fewer than 3 options exist — individual buttons are clearer

---

## Tabs

- **Use for**: parallel sections on the same subject — Overview | Activity | Documents
- **Not for**: page navigation (use Nav Menu), fewer than 2 tabs, or interdependent content
- `variant="icon"` — tabs with icon + label, good for visually distinct navigation
- `showArrows` — adds scroll arrows on overflow; use with icon tabs or responsive layouts
- `showUnderline` — adds underline indicator on active tab
- Keep labels short · default tab should have the most-needed content
- Don't mix icon and non-icon tabs

---

## Tooltip

A short label that appears on hover or focus to explain an element — usually an icon or abbreviated text.

- Use to label icon-only buttons — always
- Bear in mind mobile users won't see hover tooltips — don't rely on them for critical information

---

## Calendar

A date-picking calendar for selecting single dates, ranges, or multiple dates.

- Use inside a Popover or Date Picker — not standalone on a page
- `mode="single"` for one date · `mode="range"` for start/end · `mode="multiple"` for non-contiguous picks
- Disable past or future dates where the context requires it (e.g. can't schedule in the past)
- Consider Date Picker (input + calendar) for forms — Calendar alone suits custom pickers or inline scheduling UIs

---

## Context Menu

Right-click menu for power-user shortcuts. Always mirror key actions in a visible Dropdown Menu too — many users won't discover right-click. Not suitable for touch/mobile.

---

## Table / Data Table

Use `Table` for simple read-only data. Use `DataTable` (TanStack Table) when you need sorting, filtering, pagination, or row selection — add only the features you need.

- **Sorting**: add `getSortedRowModel()` + `onSortingChange` · use `DataTableColumnHeader` for sortable/hideable columns
- **Filtering**: add `getFilteredRowModel()` + `onColumnFiltersChange` · filter per column via `column.setFilterValue()`
- **Pagination**: add `getPaginationRowModel()` · use `DataTablePagination` for page size + nav controls
- **Row selection**: add `onRowSelectionChange` + checkbox column · access via `table.getFilteredSelectedRowModel()`
- **Column visibility**: add `onColumnVisibilityChange` · use `DataTableViewOptions` for a toggle dropdown
- Access row data in cell renderers via `row.original`
- Always provide an empty state using the `Empty` component — not just "No results."

---

## Date Picker

Always use a date picker that combines a text input with a calendar popover — users should be able to type or click. Use range variant for start/end pairs.

- Consider `chrono-node` to support natural language input (e.g. "next Monday", "in 2 weeks") — particularly valuable in healthcare contexts like appointment scheduling where typing is faster than clicking through a calendar

---

## Hover Card

Preview of an entity on hover — e.g. a care worker's name showing role and contact details.

- Supplement visible content, don't replace it — mobile/keyboard users won't trigger it
- Read-only preview only — use Popover if the user needs to interact

---

## Input / Field / Form

**Input**: Single-line text entry.

- Use `type` appropriately — `email`, `password`, `number`, `tel` for correct keyboard and browser behaviour
- Pair with a button, icon, or prefix/suffix? Use Input Group

**Field**: Wraps an Input with a Label, helper text, and error message as a single unit. Prefer Field over a raw Input in forms — it handles layout and accessibility wiring automatically.

**Form**: Use with React Hook Form. Wrap fields in `FormField` → `FormItem` → `FormLabel` + `FormControl` + `FormMessage`.

- `FormMessage` surfaces validation errors automatically from the schema
- Always validate with Zod — define the schema first, then build the form from it
- Group related fields visually but keep each `FormField` independent
- Avoid nesting forms

---

## Label

Every form input needs one. Use `htmlFor` / `id` to associate programmatically. Never use placeholder text as a substitute.

---

## Progress

A bar showing completion status of a known process.

- `variant="mini"` — thinner bar for compact or inline contexts
- `accent` — same accent colours as Badge (`success`, `warning`, `destructive`, `teal`, `purple`, etc.)
- Always pair with a label — percentage, step count, or description
- Use Spinner/Skeleton for indeterminate states

---

## Radio Group

One option from a visible set. Multiple selections? Use Checkbox. More than ~6 options? Use Select or Combobox.

---

## Select / Combobox

Both pick one option from a list — choose based on list length.

|               | Select            | Combobox                  |
| ------------- | ----------------- | ------------------------- |
| **List size** | Up to ~10 options | 10+ options               |
| **Typing**    | No                | Yes — filters as you type |
| **Use for**   | Fixed short lists | Long or dynamic lists     |

Both: always include a clear placeholder · don't use for boolean on/off (use Switch or Checkbox)

Combobox only:

- Always show an empty state when no results match
- `multiple` + `ComboboxChips` for multi-select with chip display
- `showClear` to add a reset button
- `ComboboxItem` accepts custom content — e.g. avatar + name, status badge + label

---

## Slider

For approximate range selection (filters, volume, opacity). Always show the current value and min/max labels. Need an exact value? Use Input instead.

---

## Sonner (Toast)

Transient feedback after a user-triggered action — best for success and info only.

- Avoid for errors and warnings — toasts disappear before users can act, which is an accessibility problem. Use Alert instead
- If the user needs to act on the message, use Alert or Alert Dialog
- Keep copy to one line · don't stack — queue or consolidate
- Position: consider the layout of the app — avoid corners that overlap key UI (e.g. bottom-right may clash with a sidebar or action bar)

---

## Switch

- Label with the thing being toggled, not the action — "Email notifications" not "Enable emails"
- Don't use when the setting needs to be saved with other form fields — use Checkbox instead

---

## Textarea

Multi-line text for notes, descriptions, comments. Show character limit if capped. Use Input for single-line values.

---

## Toggle / Toggle Group

Buttons that remember on/off state. Use for formatting controls, view modes, filters.

- `type="single"` — mutually exclusive (e.g. text alignment)
- `type="multiple"` — independent (e.g. Bold + Italic both active)
- Don't use for navigation — use Tabs

---

## Carousel

A scrollable sequence of items — images, cards, or content panels.

- Use for browsing a collection where items can be viewed one at a time or in a strip
- Always show prev/next controls and indicate position — dots or a count
- Avoid auto-advancing — it is disorienting and an accessibility problem
- Don't hide important content in a carousel — it's easily missed

---

## Chart

Built on Recharts. Use for visualising trends, distributions, and comparisons.

- Line for trends over time · bar for comparisons · pie/donut sparingly for proportions
- Always include axis labels and a legend where needed
- One clear message per chart — keep it simple
- Use ChartTooltip and ChartLegend for consistent styling

---

## Collapsible

Toggle a single section of content. Lighter than Accordion — use when you only need one show/hide section.

- Use Accordion when you have multiple coordinated collapsible sections
- The trigger can be any element — button, heading, row

---

## Command

A searchable command palette — combines search with a list of actions or options. Powers Combobox internally.

- Use for power-user search-and-act flows — e.g. a global search, quick-action launcher
- Can group results with `CommandGroup` and `CommandSeparator`
- Always handle the empty state with `CommandEmpty`
- Not for standard form selection — use Combobox or Select instead

---

## Empty

The standard empty state component. Use whenever a list, table, or page section has no content to show.

- Use for zero-data on load, filtered results with no matches, or post-delete states
- Include a brief message and, where appropriate, a call to action — e.g. "No records found · Create one"
- Don't use plain text strings like "No results." — always use the `Empty` component

---

## Input OTP

A one-time password input with segmented character fields.

- Use for verification codes, PINs, or any fixed-length code entry
- Set `maxLength` to match the expected code length
- Handle paste — users often copy codes from SMS or email

---

## Item

A flexible list item component for building consistent lists, menus, and record rows.

- Use as the building block for custom list UIs where a full Data Table is too heavy
- Supports leading icons/avatars, labels, descriptions, and trailing actions
- Keep structure consistent across items in the same list

---

## Kbd

Displays a keyboard shortcut or key combination.

- Use inline in tooltips, help text, or documentation to indicate keyboard shortcuts
- Wrap each key individually — e.g. `<Kbd>⌘</Kbd><Kbd>K</Kbd>`

---

## Menubar

A horizontal application menu bar — File, Edit, View style navigation.

- Use for desktop-style application layouts that need persistent top-level menu navigation
- Not for standard web navigation — use Navigation Menu or Sidebar instead
- Group related actions under logical top-level labels

---

## Navigation Menu

Horizontal or top-level navigation with support for dropdowns and rich content.

- Use for primary site or app navigation
- Supports mega-menus and grouped links via `NavigationMenuContent`
- Keep top-level labels short and scannable
- Don't use for in-page navigation between sections — use Tabs

---

## Pagination

Controls for navigating between pages of results.

- Use with Data Table or any paginated list
- Show current page and total where possible — e.g. "Page 2 of 14"
- Consider page size selection alongside pagination for large datasets

---

## Resizable

Panels that users can resize by dragging a handle between them.

- Use for split-pane layouts — e.g. a list alongside a detail view
- Set sensible `minSize` constraints so panels don't collapse to unusable sizes
- Persist panel sizes to user preferences where the layout is frequently used

---

## Scroll Area

A styled, cross-browser scrollable container.

- Use instead of native `overflow: auto` for consistent scrollbar styling across platforms
- Use for fixed-height containers with overflowing content — sidebars, panels, modals
- Don't wrap an entire page in a Scroll Area — only constrained regions

---

## Separator

A visual divider between sections or items.

- Prefer layout spacing (margin/padding) for most separations — use Separator only when a visible line genuinely aids scanning
- Available in horizontal and vertical orientations

---

## Sidebar

The main application navigation sidebar.

- Use the Evo Sidebar block for the standard app shell — don't build a custom sidebar from scratch
- Supports collapsible sections, icons, badges, and nested nav items
- Keep top-level items to the most important destinations — secondary items can live in nested groups

---

## Skeleton

A loading placeholder that mimics the shape of the content being loaded.

- Use during initial data fetch to reduce perceived load time and prevent layout shift
- Match the skeleton shape closely to the real content — don't use a generic block for everything
- Use Spinner for indeterminate actions (button loading, form submit) · use Skeleton for page or content loading

---

## Spinner

An animated indicator for indeterminate loading states.

- Use for short, indeterminate waits — button loading states, form submissions, inline fetches
- Use Skeleton instead for page or content-area loading where the layout is known
- Always pair with an `aria-label` or screen-reader-only text — "Loading..."

---

---

## KPI

Displays a single key metric with icon, value, label, and optional period/description.

Use only for meaningful, persona-relevant metrics that help the user make decisions or understand status at a glance. KPIs are not decoration — every one shown should earn its place.

- `variant="mini"` — compact version for tighter layouts or secondary metrics
- `accent` — same system as Badge/Progress; use semantically (e.g. `success` for positive, `warning` for at-risk)
- `value` accepts numbers or formatted strings (e.g. `"85%"`, `"$24.8K"`)
- `period` — short contextual qualifier shown beneath the value (e.g. "last 30 days")
- Don't add KPIs just to fill space — too many dilutes the ones that matter

---

## InfoPair

Displays a labelled value with an icon and optional copy-to-clipboard. Use for structured read-only data — contact details, reference numbers, identifiers.

- `showCopy` (default: true) — shows a copy icon on hover with a brief check confirmation
- `onCopy` — optional callback after copy, e.g. to trigger a toast
- Use for values users are likely to need elsewhere — phone numbers, IDs, emails, addresses
- Don't use for editable fields — use Input instead
- Don't use for long blocks of text — this is for concise labelled values

---

## PatientBanner

Displays patient identity, demographic info, flags, alerts, and allergies in a consistent header. Use this component wherever a patient context needs to be established — do not build custom patient headers.

**Variants:**

- `full` (default) — full demographic detail with flags and action buttons. Use at the top of patient-facing pages
- `compact` — single row with key identifiers. Use in list views or when vertical space is limited
- `minimal` — avatar + name + DOB + NHS only. Use inside Dialogs, Sheets, or Popovers to confirm patient context

**Props:**

- `patient` — the Patient object (name, dob, nhsNumber, gender, flags, alerts, allergies, deceased etc.)
- `showActions` — show/hide the alerts/allergies/flags action buttons (default: true)
- `onCopy` — callback fired when an InfoPair value is copied, e.g. to trigger a Toast
- Deceased patients render with a black avatar, Deceased badge, and suppress flags

**Sub-components (exported separately):**

- `PatientFlagBadges` — flag badges only, for use in custom layouts
- `FlagsPopoverContent`, `AlertsPopoverContent`, `AllergiesPopoverContent` — popover detail panels if needed standalone

Always use `PatientBanner` to establish patient context — never build an ad-hoc patient header from primitives.

---

## PrimaryTemplate (Default Page Layout)

The standard application shell for desktop products. **Start with this for all new pages unless there is a specific reason not to.** Not intended for MFEs.

Prefer sidebar navigation (PrimaryTemplate) over a top Navigation Menu — it scales better, supports hierarchy, and keeps the content area clean.

See primary-template.tsx for props and NavigationItem type. Page content renders in a flex column.
