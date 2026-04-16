import { useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { fmt } from "@/lib/formatters"
import { getAvatar } from "@/config/avatars"
import { ELV_ACCOUNTS } from "@/config/elvAccounts"
import {
  TrendingUp, Calendar, Building2, Tag, Star,
  AlertTriangle, CheckCircle2, Clock, FileText
} from "lucide-react"
import type { Deal } from "@/types"

interface OpportunityCardModalProps {
  deal: Deal | null
  onClose: () => void
}

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, className = "" }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value ?? "—"}</p>
      </div>
    </div>
  )
}

export function OpportunityCardModal({ deal, onClose }: OpportunityCardModalProps) {
  const av = useMemo(() => {
    if (!deal?.User) return null
    return getAvatar(deal.User)
  }, [deal])

  const elvAccount = useMemo(() => {
    if (!deal) return null
    return ELV_ACCOUNTS.find(
      (e) => e.accountName.toLowerCase() === (deal["Account Name"] ?? "").toLowerCase() ||
             e.accountCode === deal["Account Name"]
    ) ?? null
  }, [deal])

  if (!deal) return null

  const gradient = av?.gradient ?? "from-slate-500 to-slate-600"
  const bg = av?.bg ?? "64748b"

  const isWon = deal._stageSummary === "Won"
  const isLost = deal._stageSummary === "Lost"
  const isPipe = deal._stageSummary === "Pipe"

  const statusColor = isWon
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : isLost
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : "bg-blue-500/20 text-blue-400 border-blue-500/30"

  const commitColor = deal._commit === "Commit"
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : deal._commit === "Upside"
    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : "bg-slate-500/20 text-slate-400 border-slate-500/30"

  const meddpicc = deal._meddpicc ?? null
  const meddpiccColor = meddpicc === null ? "" : meddpicc >= 70 ? "bg-emerald-500" : meddpicc >= 40 ? "bg-amber-500" : "bg-red-500"

  return (
    <Dialog open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-card border-border">

        {/* Header — coloured to AD */}
        <div className={`bg-gradient-to-r ${gradient} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0"
                style={{ backgroundColor: `#${bg}` }}
              >
                {av?.initials ?? "?"}
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-black text-lg leading-tight break-words">
                  {deal["Opportunity Name"] ?? "Opportunity"}
                </h2>
                <p className="text-white/70 text-sm mt-0.5">{deal["Account Name"] ?? "—"}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge className={`text-xs border ${statusColor}`}>
                    {deal._stageSummary ?? "Pipe"}
                  </Badge>
                  {deal._commit && (
                    <Badge className={`text-xs border ${commitColor}`}>
                      {deal._commit}
                    </Badge>
                  )}
                  {deal._keyDeal === "Key" && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      ⭐ Key Deal
                    </Badge>
                  )}
                  {deal._risk === "Risk" && (
                    <Badge className="bg-red-500/30 text-red-200 border-red-400/30 text-xs">
                      ⚠ Risk
                    </Badge>
                  )}
                  {deal._dealType && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      {deal._dealType}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white/60 text-[10px] uppercase tracking-wider">Split ABC (OI)</p>
              <p className="text-white font-black text-2xl">{fmt(deal._val ?? 0)}</p>
              {(deal._abc ?? 0) > 0 && (
                <>
                  <p className="text-white/60 text-[10px] uppercase tracking-wider mt-1">Total ABC (ARR)</p>
                  <p className="text-white/90 font-bold text-base">{fmt(deal._abc ?? 0)}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Split ABC</p>
              <p className="text-lg font-black text-foreground">{fmt(deal._val ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">OI Value</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total ABC</p>
              <p className="text-lg font-black text-foreground">{(deal._abc ?? 0) > 0 ? fmt(deal._abc ?? 0) : "—"}</p>
              <p className="text-[10px] text-muted-foreground">ARR Value</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Services</p>
              <p className="text-lg font-black text-emerald-400">{(deal._services ?? 0) > 0 ? fmt(deal._services ?? 0) : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Services £</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Initials</p>
              <p className="text-lg font-black text-blue-400">{(deal._initials ?? 0) > 0 ? fmt(deal._initials ?? 0) : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Initials £</p>
            </div>
          </div>

          {/* Deal details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                Deal Details
              </h3>
              <InfoRow icon={Building2} label="Account" value={deal["Account Name"]} />
              <InfoRow icon={TrendingUp} label="Sales Lead" value={deal.User} />
              <InfoRow icon={Calendar} label="Close Date" value={deal["Close Date"] ?? deal["Close Date (2)"]} />
              <InfoRow icon={Clock} label="Close Month" value={deal._month} />
              <InfoRow icon={Tag} label="Product" value={deal._product ?? "No Match"} />
              <InfoRow icon={Star} label="Stage" value={deal.Stage} />
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                Pipeline Info
              </h3>
              <InfoRow icon={CheckCircle2} label="Commit Status" value={deal._commit} />
              <InfoRow icon={AlertTriangle} label="Push Count" value={deal._push !== undefined ? `${deal._push} pushes` : "—"} />
              <InfoRow icon={Clock} label="Stage Duration" value={deal._stageDur !== undefined ? `${deal._stageDur} days` : "—"} />
              <InfoRow icon={Calendar} label="Quarter" value={deal._quarter} />
              <InfoRow icon={TrendingUp} label="Deal Type" value={deal._dealType} />
              <InfoRow icon={Star} label="Created By" value={deal._createdBy} />
            </div>
          </div>

          {/* ELV Info */}
          {(deal._elvId || elvAccount) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                ELV Reference
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ELV ID</p>
                  <p className="font-bold text-sm">{deal._elvId ?? elvAccount?.elvId ?? "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ELV AD</p>
                  <p className="font-bold text-sm">{deal["_elvAD" as keyof Deal] as string ?? elvAccount?.elvAD ?? "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Parent</p>
                  <p className="font-bold text-sm">{elvAccount?.parentAccount ?? "—"}</p>
                </div>
                {elvAccount?.accountCode && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Account Code</p>
                    <p className="font-bold text-sm">{elvAccount.accountCode}</p>
                  </div>
                )}
                {elvAccount?.numberOfSites && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sites</p>
                    <p className="font-bold text-sm">{elvAccount.numberOfSites}</p>
                  </div>
                )}
                {elvAccount?.cpiPercent && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CPI %</p>
                    <p className="font-bold text-sm">{elvAccount.cpiPercent}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEDDPICC */}
          {meddpicc !== null && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                D.R Score
              </h3>
              <ScoreBar score={meddpicc} label="MEDDPICC Qualification" color={meddpiccColor} />
            </div>
          )}

          {/* Next Steps */}
          {deal["Next Step"] && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Next Steps
              </h3>
              <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">
                {deal["Next Step"]}
              </p>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
