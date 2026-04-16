import { useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { fmt } from "@/lib/formatters"
import { getAvatar } from "@/config/avatars"
import { ELV_ACCOUNTS } from "@/config/elvAccounts"
import { useDashboardStore } from "@/store/dashboardStore"
import { Building2, TrendingUp, Trophy, Users, Tag } from "lucide-react"

interface AccountCardModalProps {
  accountName: string | null
  onClose: () => void
}

export function AccountCardModal({ accountName, onClose }: AccountCardModalProps) {
  const { data, arrDeals } = useDashboardStore()

  const stats = useMemo(() => {
    if (!accountName) return null
    const deals = data.filter((d) => d["Account Name"] === accountName)
    const won = deals.filter((d) => d._stageSummary === "Won")
    const pipe = deals.filter((d) => d._stageSummary === "Pipe")
    const lost = deals.filter((d) => d._stageSummary === "Lost")
    const totalOI = deals.reduce((s, r) => s + (r._val ?? 0), 0)
    const totalWon = won.reduce((s, r) => s + (r._val ?? 0), 0)
    const totalPipe = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
    const winRate = won.length + lost.length > 0 ? won.length / (won.length + lost.length) : 0

    // Unique ADs
    const adSet = new Set(deals.map((d) => d.User).filter(Boolean))
    const ads = [...adSet] as string[]

    // Products
    const productSet = new Set(deals.map((d) => d._product).filter((p) => p && p !== "No Match"))
    const products = [...productSet] as string[]

    // ELV info
    const elv = ELV_ACCOUNTS.find(
      (e) => e.accountName.toLowerCase() === accountName.toLowerCase()
    ) ?? null

    // ARR
    const accountArr = arrDeals.filter((d) =>
      (d.accountName ?? "").toLowerCase() === accountName.toLowerCase()
    )
    const totalArr = accountArr.reduce((s, r) => s + (r.totalAbc ?? 0), 0)

    // Top deals by value
    const topDeals = [...deals]
      .sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
      .slice(0, 5)

    return {
      deals, won, pipe, lost, totalOI, totalWon, totalPipe,
      winRate, ads, products, elv, totalArr, topDeals,
    }
  }, [accountName, data, arrDeals])

  if (!accountName || !stats) return null

  // Colour to primary AD
  const primaryAD = stats.ads[0] ?? null
  const av = primaryAD ? getAvatar(primaryAD) : null
  const gradient = av?.gradient ?? "from-slate-500 to-slate-600"
  const bg = av?.bg ?? "64748b"

  return (
    <Dialog open={!!accountName} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-card border-border">

        {/* Header */}
        <div className={`bg-gradient-to-r ${gradient} p-6`}>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg"
              style={{ backgroundColor: `#${bg}` }}
            >
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">{accountName}</h2>
              {stats.elv && (
                <p className="text-white/70 text-sm mt-0.5">
                  {stats.elv.elvId} · {stats.elv.parentAccount}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {stats.deals.length} deals
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  OI: {fmt(stats.totalOI)}
                </Badge>
                {stats.totalArr > 0 && (
                  <Badge className="bg-white/20 text-white border-white/30 text-xs">
                    ARR: {fmt(stats.totalArr)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Won</p>
              <p className="text-xl font-black text-emerald-400">{fmt(stats.totalWon)}</p>
              <p className="text-[10px] text-muted-foreground">{stats.won.length} deals</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</p>
              <p className="text-xl font-black text-blue-400">{fmt(stats.totalPipe)}</p>
              <p className="text-[10px] text-muted-foreground">{stats.pipe.length} deals</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
              <p className="text-xl font-black text-foreground">{Math.round(stats.winRate * 100)}%</p>
              <p className="text-[10px] text-muted-foreground">{stats.lost.length} lost</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ARR</p>
              <p className="text-xl font-black text-purple-400">{stats.totalArr > 0 ? fmt(stats.totalArr) : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Total ABC</p>
            </div>
          </div>

          {/* ADs & Products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.ads.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Sales Leads
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {stats.ads.map((ad) => {
                    const adAv = getAvatar(ad)
                    return (
                      <div key={ad} className="flex items-center gap-1.5 bg-muted/60 rounded-full px-2.5 py-1">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                          style={{ backgroundColor: `#${adAv.bg}` }}
                        >
                          {adAv.initials}
                        </div>
                        <span className="text-xs font-medium">{ad.split(" ")[0]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {stats.products.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Products
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {stats.products.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ELV Reference */}
          {stats.elv && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                ELV Reference
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ELV ID</p>
                  <p className="font-bold text-sm">{stats.elv.elvId}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ELV AD</p>
                  <p className="font-bold text-sm">{stats.elv.elvAD}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Account Code</p>
                  <p className="font-bold text-sm">{stats.elv.accountCode}</p>
                </div>
                {stats.elv.numberOfSites && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sites</p>
                    <p className="font-bold text-sm">{stats.elv.numberOfSites}</p>
                  </div>
                )}
                {stats.elv.cpiPercent && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CPI %</p>
                    <p className="font-bold text-sm">{stats.elv.cpiPercent}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Deals */}
          {stats.topDeals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> Top Deals
              </h3>
              <div className="space-y-1.5">
                {stats.topDeals.map((d, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d["Opportunity Name"] ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.User?.split(" ")[0]} · {d._month} · {d._stageSummary}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{fmt(d._val ?? 0)}</p>
                      {(d._abc ?? 0) > 0 && (
                        <p className="text-[10px] text-muted-foreground">{fmt(d._abc ?? 0)} ARR</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
