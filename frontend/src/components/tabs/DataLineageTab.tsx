import { useMemo } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { fmt } from "@/lib/formatters"

interface FlowNode {
  id: string
  label: string
  sublabel?: string
  type: "source" | "process" | "output" | "store"
  color: string
  x: number
  y: number
  width: number
  height: number
}

interface FlowEdge {
  from: string
  to: string
  label?: string
}

export function DataLineageTab() {
  const { data, arrDeals, manualDeals, nonSFDeals, accountMatch } = useDashboardStore()

  const stats = useMemo(() => {
    const sfDeals = data.filter((d) => !d._isManual)
    const wonDeals = data.filter((d) => d._stageSummary === "Won")
    const pipeDeals = data.filter((d) => d._stageSummary === "Pipe")
    const enrichedCount = data.filter((d) => d._elvId).length
    const matchedCount = accountMatch.filter((a) => a.e && a.e !== "NOT-ELEVATE").length
    return { sfDeals, wonDeals, pipeDeals, enrichedCount, matchedCount }
  }, [data, arrDeals, manualDeals, nonSFDeals, accountMatch])

  const nodes: FlowNode[] = [
    // Sources
    { id: "sf", label: "Salesforce", sublabel: "CSV Export", type: "source", color: "#0ea5e9", x: 40, y: 120, width: 140, height: 60 },
    { id: "manual", label: "Manual Deals", sublabel: `${manualDeals.length} deals`, type: "source", color: "#8b5cf6", x: 40, y: 220, width: 140, height: 60 },
    { id: "nonsf", label: "Non-SF Deals", sublabel: `${nonSFDeals.length} deals`, type: "source", color: "#f59e0b", x: 40, y: 320, width: 140, height: 60 },
    { id: "arr_src", label: "ARR CSV", sublabel: "Salesforce Export", type: "source", color: "#10b981", x: 40, y: 420, width: 140, height: 60 },

    // Processing
    { id: "parse", label: "CSV Parser", sublabel: "Papaparse", type: "process", color: "#6366f1", x: 260, y: 170, width: 140, height: 60 },
    { id: "enrich", label: "enrichRow()", sublabel: "Computed fields", type: "process", color: "#6366f1", x: 260, y: 270, width: 140, height: 60 },
    { id: "arr_parse", label: "ARR Parser", sublabel: "arrImport.ts", type: "process", color: "#6366f1", x: 260, y: 420, width: 140, height: 60 },

    // Store
    { id: "zustand", label: "Zustand Store", sublabel: "Global State", type: "store", color: "#ec4899", x: 480, y: 220, width: 140, height: 60 },
    { id: "supabase", label: "Supabase", sublabel: "Cross-device sync", type: "store", color: "#ec4899", x: 480, y: 340, width: 140, height: 60 },
    { id: "local", label: "localStorage", sublabel: "Persist", type: "store", color: "#ec4899", x: 480, y: 440, width: 140, height: 60 },

    // Outputs
    { id: "oi", label: "OI Pipeline", sublabel: `${stats.sfDeals.length} deals`, type: "output", color: "#f97316", x: 700, y: 100, width: 140, height: 60 },
    { id: "arr_out", label: "ARR Tracking", sublabel: `${arrDeals.length} deals`, type: "output", color: "#f97316", x: 700, y: 190, width: 140, height: 60 },
    { id: "won", label: "Won Deals", sublabel: `${stats.wonDeals.length} closed`, type: "output", color: "#f97316", x: 700, y: 280, width: 140, height: 60 },
    { id: "pipe", label: "Open Pipeline", sublabel: `${stats.pipeDeals.length} active`, type: "output", color: "#f97316", x: 700, y: 370, width: 140, height: 60 },
    { id: "elv", label: "ELV Matching", sublabel: `${stats.enrichedCount} matched`, type: "output", color: "#f97316", x: 700, y: 460, width: 140, height: 60 },
  ]

  const edges: FlowEdge[] = [
    { from: "sf", to: "parse", label: "raw CSV" },
    { from: "manual", to: "enrich" },
    { from: "nonsf", to: "enrich" },
    { from: "parse", to: "enrich", label: "rows[]" },
    { from: "enrich", to: "zustand", label: "Deal[]" },
    { from: "arr_src", to: "arr_parse", label: "raw CSV" },
    { from: "arr_parse", to: "zustand", label: "ARRDeal[]" },
    { from: "zustand", to: "supabase", label: "sync" },
    { from: "zustand", to: "local", label: "persist" },
    { from: "zustand", to: "oi" },
    { from: "zustand", to: "arr_out" },
    { from: "zustand", to: "won" },
    { from: "zustand", to: "pipe" },
    { from: "zustand", to: "elv" },
  ]

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))

  function getCenter(n: FlowNode, side: "left" | "right") {
    return {
      x: side === "right" ? n.x + n.width : n.x,
      y: n.y + n.height / 2,
    }
  }

  const SVG_W = 880
  const SVG_H = 560

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Data Lineage</h2>
        <p className="text-sm text-zinc-400 mt-1">How data flows through E.V.E — from source to insights</p>
      </div>

      {/* Flow diagram */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto">
        <svg width={SVG_W} height={SVG_H} className="font-sans">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#52525b" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const from = nodeMap[e.from]
            const to = nodeMap[e.to]
            if (!from || !to) return null
            const start = getCenter(from, "right")
            const end = getCenter(to, "left")
            const mx = (start.x + end.x) / 2
            return (
              <g key={i}>
                <path
                  d={`M${start.x},${start.y} C${mx},${start.y} ${mx},${end.y} ${end.x},${end.y}`}
                  fill="none"
                  stroke="#3f3f46"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
                {e.label && (
                  <text
                    x={mx}
                    y={(start.y + end.y) / 2 - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#71717a"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={n.width}
                height={n.height}
                rx={8}
                fill={n.color + "18"}
                stroke={n.color}
                strokeWidth={1.5}
              />
              <text x={n.x + n.width / 2} y={n.y + 22} textAnchor="middle" fontSize={12} fontWeight="600" fill={n.color}>
                {n.label}
              </text>
              {n.sublabel && (
                <text x={n.x + n.width / 2} y={n.y + 38} textAnchor="middle" fontSize={10} fill="#a1a1aa">
                  {n.sublabel}
                </text>
              )}
            </g>
          ))}

          {/* Column labels */}
          {[
            { x: 110, label: "Sources" },
            { x: 330, label: "Processing" },
            { x: 550, label: "State" },
            { x: 770, label: "Outputs" },
          ].map((col) => (
            <text key={col.label} x={col.x} y={30} textAnchor="middle" fontSize={11} fontWeight="700" fill="#52525b" letterSpacing="1">
              {col.label.toUpperCase()}
            </text>
          ))}
        </svg>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "SF Deals Imported", value: stats.sfDeals.length.toString(), color: "#0ea5e9" },
          { label: "ARR Deals", value: arrDeals.length.toString(), color: "#10b981" },
          { label: "Won Deals", value: stats.wonDeals.length.toString(), color: "#f97316" },
          { label: "ELV Matched", value: stats.enrichedCount.toString(), color: "#8b5cf6" },
          { label: "Open Pipeline", value: stats.pipeDeals.length.toString(), color: "#6366f1" },
          { label: "Manual Deals", value: manualDeals.length.toString(), color: "#ec4899" },
          { label: "Account Rules", value: accountMatch.length.toString(), color: "#f59e0b" },
          { label: "Non-SF Deals", value: nonSFDeals.length.toString(), color: "#a78bfa" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Field mapping reference */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Key Field Mappings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {[
            { sf: "ABC Split Value", computed: "_val", used: "OI Pipeline, Targets" },
            { sf: "Total ABC", computed: "_abc", used: "ARR Tracking" },
            { sf: "Stage", computed: "_stageSummary", used: "Won / Lost / Pipe" },
            { sf: "Close Date", computed: "_month / _quarter", used: "Monthly & Quarterly views" },
            { sf: "User (col J)", computed: "Sales Lead", used: "All Deals tab" },
            { sf: "Account Name", computed: "_elvId / _elvAD", used: "ELV matching" },
            { sf: "Services Amount", computed: "_services", used: "Services tab" },
            { sf: "Commit Status", computed: "_commit", used: "Forecast, Monthly" },
          ].map((row) => (
            <div key={row.sf} className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sky-400 font-mono">{row.sf}</span>
                <span className="text-zinc-500">→</span>
                <span className="text-violet-400 font-mono">{row.computed}</span>
              </div>
              <div className="text-zinc-500">{row.used}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
