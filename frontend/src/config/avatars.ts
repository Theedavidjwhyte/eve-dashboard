// ── Avatar config for each Account Director ─────────────────────────────────
// Initials in a coloured bubble only — no emojis, no gender indicators

export interface ADAvatar {
  name: string
  initials: string
  short: string         // first name only
  bg: string            // background colour hex (no #)
  fg: string            // foreground/text colour hex (no #)
  ring: string          // Tailwind ring class
  gradient: string      // Tailwind gradient classes
  role: string          // display role
}

export const AD_AVATARS: Record<string, ADAvatar> = {
  "Chevonne Souness": {
    name: "Chevonne Souness",
    initials: "CS",
    short: "Chevonne",
    bg: "7c3aed",
    fg: "ffffff",
    ring: "ring-violet-500",
    gradient: "from-violet-600 to-purple-700",
    role: "Account Manager",
  },
  "Dan Turner": {
    name: "Dan Turner",
    initials: "DT",
    short: "Dan",
    bg: "0ea5e9",
    fg: "ffffff",
    ring: "ring-sky-500",
    gradient: "from-sky-500 to-blue-600",
    role: "Account Manager",
  },
  "David Whyte": {
    name: "David Whyte",
    initials: "DW",
    short: "David",
    bg: "10b981",
    fg: "ffffff",
    ring: "ring-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
    role: "Account Manager",
  },
  "James Roberts": {
    name: "James Roberts",
    initials: "JR",
    short: "James",
    bg: "f59e0b",
    fg: "ffffff",
    ring: "ring-amber-500",
    gradient: "from-amber-500 to-orange-600",
    role: "Account Manager",
  },
  "Samantha Backhouse": {
    name: "Samantha Backhouse",
    initials: "SB",
    short: "Sam",
    bg: "6366f1",
    fg: "ffffff",
    ring: "ring-indigo-500",
    gradient: "from-indigo-500 to-violet-600",
    role: "Account Manager",
  },
}

// Returns a sensible fallback for any name not in the map
export function getAvatar(name: string): ADAvatar {
  if (!name) return fallbackAvatar("?", "Unknown")
  const direct = AD_AVATARS[name]
  if (direct) return direct
  // Try matching by first name only
  const first = name.split(" ")[0].toLowerCase()
  const match = Object.values(AD_AVATARS).find(
    (a) => a.short.toLowerCase() === first
  )
  if (match) return match
  return fallbackAvatar(name.slice(0, 2).toUpperCase(), name)
}

function fallbackAvatar(initials: string, name: string): ADAvatar {
  return {
    name,
    initials,
    short: name.split(" ")[0],
    bg: "64748b",
    fg: "ffffff",
    ring: "ring-slate-400",
    gradient: "from-slate-500 to-slate-600",
    role: "Account Manager",
  }
}

// Consistent display order across all tables/views
export const AD_ORDER = [
  "Chevonne Souness",
  "Dan Turner",
  "David Whyte",
  "James Roberts",
  "Samantha Backhouse",
]
