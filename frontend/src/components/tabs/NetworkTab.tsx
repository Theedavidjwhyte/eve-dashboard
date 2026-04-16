import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useDashboardStore, userMatchesFilter } from "@/store/dashboardStore"
import { PRODUCT_GROUPS } from "@/config/products"
import { USERS } from "@/config/users"
import { fmt } from "@/lib/formatters"
import { cn } from "@/lib/utils"

// ── Node & Edge types ─────────────────────────────────────────────────────────
type NodeKind = "ad" | "elvGroup" | "product" | "stage"

interface GraphNode {
  id: string
  kind: NodeKind
  label: string
  sub?: string
  value: number      // deal value for sizing
  count: number      // deal count
  won: number
  pipe: number
  x: number
  y: number
  vx: number
  vy: number
  fx?: number        // fixed x (when pinned)
  fy?: number        // fixed y (when pinned)
  radius: number
}

interface GraphEdge {
  source: string
  target: string
  value: number
  won: number
}

// ── Colour palette ────────────────────────────────────────────────────────────
const KIND_COLOR: Record<NodeKind, { fill: string; stroke: string; text: string }> = {
  ad:       { fill: "#3b82f6", stroke: "#2563eb", text: "#fff" },
  elvGroup: { fill: "#8b5cf6", stroke: "#7c3aed", text: "#fff" },
  product:  { fill: "#14b8a6", stroke: "#0d9488", text: "#fff" },
  stage:    { fill: "#f59e0b", stroke: "#d97706", text: "#fff" },
}

const STAGE_ORDER = [
  "Discovery", "Evaluation", "Negotiation",
  "Decision", "Commitment", "Closed Won", "Closed Lost",
]

// ── Force simulation (simple Barnes-Hut-ish) ──────────────────────────────────
function applyForces(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  alpha: number
) {
  const REPEL = 4000
  const LINK  = 0.06
  const GRAV  = 0.01
  const cx = width / 2
  const cy = height / 2

  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      const dx = b.x - a.x || 0.01
      const dy = b.y - a.y || 0.01
      const dist2 = dx * dx + dy * dy
      const dist  = Math.sqrt(dist2)
      const minD  = a.radius + b.radius + 20
      if (dist < minD * 3) {
        const f = (REPEL / dist2) * alpha
        const fx = (dx / dist) * f
        const fy = (dy / dist) * f
        a.vx -= fx; a.vy -= fy
        b.vx += fx; b.vy += fy
      }
    }
  }

  // Link attraction
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  for (const e of edges) {
    const a = nodeMap.get(e.source)
    const b = nodeMap.get(e.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const idealDist = a.radius + b.radius + 80
    const f = (dist - idealDist) * LINK * alpha
    const fx = (dx / dist) * f
    const fy = (dy / dist) * f
    if (!a.fx) { a.vx += fx; a.vy += fy }
    if (!b.fx) { b.vx -= fx; b.vy -= fy }
  }

  // Gravity toward centre
  for (const n of nodes) {
    if (n.fx !== undefined) continue
    n.vx += (cx - n.x) * GRAV * alpha
    n.vy += (cy - n.y) * GRAV * alpha

    // Damping
    n.vx *= 0.7
    n.vy *= 0.7

    n.x += n.vx
    n.y += n.vy

    // Boundary
    const r = n.radius + 8
    n.x = Math.max(r, Math.min(width - r, n.x))
    n.y = Math.max(r, Math.min(height - r, n.y))
  }
}

// ── View modes ────────────────────────────────────────────────────────────────
type ViewMode = "ad-product" | "ad-elv" | "elv-product" | "pipeline"

const VIEW_OPTIONS: { id: ViewMode; label: string; desc: string }[] = [
  { id: "ad-product",  label: "AD → Product",    desc: "Which ADs sell which products" },
  { id: "ad-elv",      label: "AD → Accounts",   desc: "ADs connected to ELV account groups" },
  { id: "elv-product", label: "Account → Product", desc: "ELV groups connected to products" },
  { id: "pipeline",    label: "Pipeline Flow",   desc: "Deal stage funnel with value flow" },
]

// ── Main component ────────────────────────────────────────────────────────────
export function NetworkTab() {
  const { data, filters } = useDashboardStore()
  const svgRef      = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef     = useRef<number>(0)
  const alphaRef    = useRef(1)

  const [viewMode, setViewMode]       = useState<ViewMode>("ad-product")
  const [nodes,    setNodes]          = useState<GraphNode[]>([])
  const [edges,    setEdges]          = useState<GraphEdge[]>([])
  const [selected, setSelected]       = useState<GraphNode | null>(null)
  const [hovered,  setHovered]        = useState<string | null>(null)
  const [dim,      setDim]            = useState({ w: 900, h: 600 })
  const [dragging, setDragging]       = useState<GraphNode | null>(null)
  const [dragStart, setDragStart]     = useState({ mx: 0, my: 0, nx: 0, ny: 0 })
  const [transform, setTransform]     = useState({ x: 0, y: 0, k: 1 })
  const [panning,   setPanning]       = useState(false)
  const [panStart,  setPanStart]      = useState({ mx: 0, my: 0, tx: 0, ty: 0 })
  const [showLabels, setShowLabels]   = useState(true)
  const [minValue,   setMinValue]     = useState(0)
  const [showGroup,  setShowGroup]    = useState("All")

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data.filter(d => d._stageSummary !== "Lost")
    if (filters.user !== "All") rows = rows.filter(d => userMatchesFilter(d.User, filters.user))
    if (filters.product !== "All") rows = rows.filter(d => d._product === filters.product)
    if (filters.group !== "All") {
      const gp = PRODUCT_GROUPS[filters.group]
      if (gp) rows = rows.filter(d => gp.includes(d._product ?? ""))
    }
    if (minValue > 0) rows = rows.filter(d => (d._val ?? 0) >= minValue)
    return rows
  }, [data, filters, minValue])

  // ── Build graph for current view ──────────────────────────────────────────
  const buildGraph = useCallback(() => {
    const { w, h } = dim
    const cx = w / 2, cy = h / 2
    const nodeMap = new Map<string, GraphNode>()
    const edgeMap = new Map<string, GraphEdge>()

    function ensureNode(id: string, kind: NodeKind, label: string, sub?: string): GraphNode {
      if (!nodeMap.has(id)) {
        const angle = Math.random() * Math.PI * 2
        const dist  = 80 + Math.random() * 200
        nodeMap.set(id, {
          id, kind, label, sub,
          value: 0, count: 0, won: 0, pipe: 0,
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: 0, vy: 0,
          radius: 24,
        })
      }
      return nodeMap.get(id)!
    }

    function addEdge(src: string, tgt: string, val: number, isWon: boolean) {
      const key = `${src}→${tgt}`
      if (!edgeMap.has(key)) edgeMap.set(key, { source: src, target: tgt, value: 0, won: 0 })
      const e = edgeMap.get(key)!
      e.value += val
      if (isWon) e.won += val
    }

    if (viewMode === "ad-product") {
      filtered.forEach(d => {
        const ad  = d.User ?? "Unknown"
        const prd = d._product ?? "No Match"
        const grp = Object.entries(PRODUCT_GROUPS).find(([, v]) => v.includes(prd))?.[0] ?? "Other"
        if (showGroup !== "All" && grp !== showGroup) return
        const val = d._val ?? 0
        const isWon = d._stageSummary === "Won"
        const aN = ensureNode(`ad:${ad}`,   "ad",      ad.split(" ")[0])
        const pN = ensureNode(`prd:${prd}`, "product", prd, grp)
        aN.value += val; aN.count++; if (isWon) aN.won += val; else aN.pipe += val
        pN.value += val; pN.count++; if (isWon) pN.won += val; else pN.pipe += val
        addEdge(`ad:${ad}`, `prd:${prd}`, val, isWon)
      })
    }

    if (viewMode === "ad-elv") {
      filtered.forEach(d => {
        const ad  = d.User ?? "Unknown"
        const elv = d._elvId ?? "Unmatched"
        const val = d._val ?? 0
        const isWon = d._stageSummary === "Won"
        const aN = ensureNode(`ad:${ad}`,   "ad",       ad.split(" ")[0])
        const eN = ensureNode(`elv:${elv}`, "elvGroup", elv,
          d["Account Name"] ? String(d["Account Name"]).substring(0, 20) : undefined)
        aN.value += val; aN.count++; if (isWon) aN.won += val; else aN.pipe += val
        eN.value += val; eN.count++; if (isWon) eN.won += val; else eN.pipe += val
        addEdge(`ad:${ad}`, `elv:${elv}`, val, isWon)
      })
    }

    if (viewMode === "elv-product") {
      filtered.forEach(d => {
        const elv = d._elvId ?? "Unmatched"
        const prd = d._product ?? "No Match"
        const val = d._val ?? 0
        const isWon = d._stageSummary === "Won"
        const eN = ensureNode(`elv:${elv}`, "elvGroup", elv)
        const pN = ensureNode(`prd:${prd}`, "product",  prd)
        eN.value += val; eN.count++; if (isWon) eN.won += val; else eN.pipe += val
        pN.value += val; pN.count++; if (isWon) pN.won += val; else pN.pipe += val
        addEdge(`elv:${elv}`, `prd:${prd}`, val, isWon)
      })
    }

    if (viewMode === "pipeline") {
      // Stage funnel — left to right
      const stageNodes: Record<string, GraphNode> = {}
      STAGE_ORDER.forEach((stage, i) => {
        const id = `stage:${stage}`
        const x = 80 + (i / (STAGE_ORDER.length - 1)) * (w - 160)
        const y = cy
        const n: GraphNode = {
          id, kind: "stage", label: stage, value: 0, count: 0, won: 0, pipe: 0,
          x, y, vx: 0, vy: 0, fx: x, fy: y, radius: 30,
        }
        nodeMap.set(id, n)
        stageNodes[stage] = n
      })

      // AD source nodes
      const adRows: Record<string, { val: number; count: number }> = {}
      filtered.forEach(d => {
        const ad    = d.User ?? "Unknown"
        const stage = d.Stage ?? "Unknown"
        const val   = d._val ?? 0
        if (!stageNodes[stage]) return
        if (!adRows[ad]) adRows[ad] = { val: 0, count: 0 }
        adRows[ad].val += val; adRows[ad].count++
        const sN = stageNodes[stage]
        sN.value += val; sN.count++
        if (d._stageSummary === "Won") sN.won += val; else sN.pipe += val
        addEdge(`stage:${stage}`, `stage:${stage}`, val, d._stageSummary === "Won")
      })

      // Flow edges between consecutive stages
      const stageTotals: Record<string, number> = {}
      data.forEach(d => { stageTotals[d.Stage ?? "Unknown"] = (stageTotals[d.Stage ?? "Unknown"] ?? 0) + 1 })
      for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
        const from = STAGE_ORDER[i], to = STAGE_ORDER[i + 1]
        const fromN = stageNodes[from], toN = stageNodes[to]
        if (fromN && toN && fromN.count > 0 && toN.count > 0) {
          edgeMap.set(`stage:${from}→stage:${to}`, {
            source: `stage:${from}`, target: `stage:${to}`,
            value: Math.min(fromN.value, toN.value),
            won: toN.won,
          })
        }
      }
    }

    // Size nodes by value
    const maxVal = Math.max(...Array.from(nodeMap.values()).map(n => n.value), 1)
    nodeMap.forEach(n => {
      n.radius = Math.max(18, Math.min(52, 18 + (n.value / maxVal) * 34))
    })

    // Fix AD nodes in a circle for ad-product view
    if (viewMode === "ad-product") {
      const adNodes = Array.from(nodeMap.values()).filter(n => n.kind === "ad")
      adNodes.forEach((n, i) => {
        const angle = (i / adNodes.length) * Math.PI * 2 - Math.PI / 2
        n.fx = cx + Math.cos(angle) * 180
        n.fy = cy + Math.sin(angle) * 180
        n.x  = n.fx; n.y = n.fy
      })
    }

    // Fix ELV nodes on left, products on right for elv-product
    if (viewMode === "elv-product") {
      const elvNodes = Array.from(nodeMap.values()).filter(n => n.kind === "elvGroup")
      const prdNodes = Array.from(nodeMap.values()).filter(n => n.kind === "product")
      elvNodes.forEach((n, i) => {
        n.fx = 130; n.fy = 60 + (i / (elvNodes.length || 1)) * (h - 120); n.x = n.fx; n.y = n.fy
      })
      prdNodes.forEach((n, i) => {
        n.fx = w - 130; n.fy = 60 + (i / (prdNodes.length || 1)) * (h - 120); n.x = n.fx; n.y = n.fy
      })
    }

    alphaRef.current = 1
    setNodes(Array.from(nodeMap.values()))
    setEdges(Array.from(edgeMap.values()))
    setSelected(null)
  }, [dim, viewMode, filtered, showGroup])

  // Rebuild when view mode / data / dim changes
  useEffect(() => { buildGraph() }, [buildGraph])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 100 && height > 100) setDim({ w: width, h: height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Animation loop
  useEffect(() => {
    let frameId: number
    function tick() {
      if (alphaRef.current > 0.001) {
        setNodes(prev => {
          const copy = prev.map(n => ({ ...n }))
          applyForces(copy, edges, dim.w, dim.h, alphaRef.current)
          alphaRef.current *= 0.95
          return copy
        })
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    animRef.current = frameId
    return () => cancelAnimationFrame(frameId)
  }, [edges, dim])

  // ── Edge stroke width ─────────────────────────────────────────────────────
  const maxEdgeVal = useMemo(() => Math.max(...edges.map(e => e.value), 1), [edges])

  function edgeWidth(val: number) {
    return Math.max(1, Math.min(8, (val / maxEdgeVal) * 8))
  }

  // ── SVG helpers ───────────────────────────────────────────────────────────
  function svgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const rect = svg.getBoundingClientRect()
    return {
      x: (clientX - rect.left - transform.x) / transform.k,
      y: (clientY - rect.top  - transform.y) / transform.k,
    }
  }

  // ── Mouse/touch handlers ──────────────────────────────────────────────────
  function onNodeMouseDown(e: React.MouseEvent, node: GraphNode) {
    e.stopPropagation()
    setDragging(node)
    const pt = svgPoint(e.clientX, e.clientY)
    setDragStart({ mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y })
    node.fx = pt.x; node.fy = pt.y
    setSelected(node)
  }

  function onSvgMouseDown(e: React.MouseEvent) {
    if (dragging) return
    setPanning(true)
    setPanStart({ mx: e.clientX, my: e.clientY, tx: transform.x, ty: transform.y })
  }

  function onMouseMove(e: React.MouseEvent) {
    if (dragging) {
      const pt = svgPoint(e.clientX, e.clientY)
      setNodes(prev => prev.map(n => {
        if (n.id !== dragging.id) return n
        return { ...n, x: pt.x, y: pt.y, fx: pt.x, fy: pt.y }
      }))
      alphaRef.current = 0.3
    } else if (panning) {
      setTransform(prev => ({
        ...prev,
        x: panStart.tx + (e.clientX - panStart.mx),
        y: panStart.ty + (e.clientY - panStart.my),
      }))
    }
  }

  function onMouseUp() {
    if (dragging) {
      // Unpin node unless Shift held
      setNodes(prev => prev.map(n => {
        if (n.id !== dragging.id) return n
        const { fx: _fx, fy: _fy, ...rest } = n
        return rest
      }))
    }
    setDragging(null)
    setPanning(false)
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(prev => {
      const k = Math.max(0.2, Math.min(4, prev.k * delta))
      const x = mx - (mx - prev.x) * (k / prev.k)
      const y = my - (my - prev.y) * (k / prev.k)
      return { x, y, k }
    })
  }

  function resetView() {
    setTransform({ x: 0, y: 0, k: 1 })
    buildGraph()
  }

  // ── Render tooltip/info card from selected node ───────────────────────────
  function renderInfoCard() {
    if (!selected) return null
    const col = KIND_COLOR[selected.kind]
    const wonPct = selected.value ? Math.round((selected.won / selected.value) * 100) : 0
    const connectedEdges = edges.filter(
      e => e.source === selected.id || e.target === selected.id
    ).sort((a, b) => b.value - a.value)
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    return (
      <div className="absolute top-4 right-4 w-64 rounded-xl border bg-card shadow-xl overflow-hidden z-10">
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: col.fill }}>
          <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
          <div>
            <div className="font-bold text-white text-sm">{selected.label}</div>
            {selected.sub && <div className="text-white/70 text-[10px]">{selected.sub}</div>}
          </div>
          <button
            onClick={() => setSelected(null)}
            className="ml-auto text-white/60 hover:text-white text-lg leading-none"
          >×</button>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Value</span>
            <span className="font-bold">{fmt(selected.value)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deals</span>
            <span className="font-semibold">{selected.count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Won</span>
            <span className="font-semibold text-green-500">{fmt(selected.won)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pipeline</span>
            <span className="font-semibold text-blue-400">{fmt(selected.pipe)}</span>
          </div>
          {/* Won bar */}
          <div className="pt-1">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${wonPct}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{wonPct}% won</div>
          </div>

          {connectedEdges.length > 0 && (
            <div className="pt-1 border-t">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Connected to
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {connectedEdges.slice(0, 8).map(e => {
                  const otherId = e.source === selected.id ? e.target : e.source
                  const other = nodeMap.get(otherId)
                  if (!other) return null
                  const otherCol = KIND_COLOR[other.kind]
                  return (
                    <button
                      key={e.source + e.target}
                      onClick={() => setSelected(other)}
                      className="w-full flex items-center justify-between gap-2 text-xs hover:bg-muted rounded px-1.5 py-1 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: otherCol.fill }} />
                        <span className="truncate">{other.label}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0">{fmt(e.value)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Summary stats bar ─────────────────────────────────────────────────────
  const totalVal  = useMemo(() => filtered.reduce((s, d) => s + (d._val ?? 0), 0), [filtered])
  const wonVal    = useMemo(() => filtered.filter(d => d._stageSummary === "Won").reduce((s, d) => s + (d._val ?? 0), 0), [filtered])
  const nodeCount = nodes.length
  const edgeCount = edges.length

  // ── Highlight logic ───────────────────────────────────────────────────────
  const highlightIds = useMemo(() => {
    if (!hovered && !selected) return null
    const focusId = hovered ?? selected?.id
    const connected = new Set([focusId!])
    edges.forEach(e => {
      if (e.source === focusId) connected.add(e.target)
      if (e.target === focusId) connected.add(e.source)
    })
    return connected
  }, [hovered, selected, edges])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  return (
    <div className="flex flex-col gap-4 h-full" style={{ minHeight: "calc(100vh - 160px)" }}>

      {/* ── Controls bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View mode toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {VIEW_OPTIONS.map(v => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              title={v.desc}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === v.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Product group filter */}
        {viewMode === "ad-product" && (
          <select
            value={showGroup}
            onChange={e => setShowGroup(e.target.value)}
            className="text-xs rounded-md border bg-card px-2 py-1.5 text-foreground outline-none"
          >
            <option value="All">All Groups</option>
            {Object.keys(PRODUCT_GROUPS).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        )}

        {/* Min value filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Min value</span>
          <select
            value={minValue}
            onChange={e => setMinValue(Number(e.target.value))}
            className="text-xs rounded-md border bg-card px-2 py-1.5 text-foreground outline-none"
          >
            <option value={0}>All</option>
            <option value={5000}>£5k+</option>
            <option value={10000}>£10k+</option>
            <option value={25000}>£25k+</option>
            <option value={50000}>£50k+</option>
          </select>
        </div>

        {/* Label toggle */}
        <button
          onClick={() => setShowLabels(v => !v)}
          className={cn(
            "text-xs px-3 py-1.5 rounded-md border transition-colors",
            showLabels ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground"
          )}
        >
          {showLabels ? "Labels on" : "Labels off"}
        </button>

        {/* Reset */}
        <button
          onClick={resetView}
          className="text-xs px-3 py-1.5 rounded-md border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          ↺ Reset
        </button>

        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto">
          {Object.entries(KIND_COLOR).map(([kind, col]) => (
            <div key={kind} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: col.fill }} />
              <span className="text-[11px] text-muted-foreground capitalize">{kind === "elvGroup" ? "Account" : kind}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="hidden xl:flex items-center gap-4 text-xs text-muted-foreground border-l pl-4 ml-2">
          <span><span className="font-semibold text-foreground">{nodeCount}</span> nodes</span>
          <span><span className="font-semibold text-foreground">{edgeCount}</span> connections</span>
          <span><span className="font-semibold text-green-500">{fmt(wonVal)}</span> won</span>
          <span><span className="font-semibold text-blue-400">{fmt(totalVal - wonVal)}</span> pipeline</span>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="relative flex-1 rounded-xl border bg-card overflow-hidden"
        style={{ minHeight: 600 }}
      >
        <svg
          ref={svgRef}
          width={dim.w}
          height={dim.h}
          className={cn("select-none", panning ? "cursor-grabbing" : dragging ? "cursor-grab" : "cursor-grab")}
          onMouseDown={onSvgMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <defs>
            {/* Glow filters per kind */}
            {Object.entries(KIND_COLOR).map(([kind, col]) => (
              <filter key={kind} id={`glow-${kind}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor={col.fill} floodOpacity="0.6" result="colour" />
                <feComposite in="colour" in2="blur" operator="in" result="glowBlur" />
                <feMerge><feMergeNode in="glowBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            {/* Arrow marker */}
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#6b7280" opacity="0.5" />
            </marker>
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>

            {/* ── Edges ── */}
            {edges.map(e => {
              const from = nodeMap.get(e.source)
              const to   = nodeMap.get(e.target)
              if (!from || !to || from.id === to.id) return null
              const isHighlit = !highlightIds || (highlightIds.has(e.source) && highlightIds.has(e.target))
              const opacity = highlightIds ? (isHighlit ? 0.85 : 0.08) : 0.35
              const wonPct = e.value ? e.won / e.value : 0
              const strokeColor = wonPct > 0.6 ? "#10b981" : wonPct > 0.3 ? "#f59e0b" : "#6b7280"

              // Curved line between nodes
              const dx = to.x - from.x
              const dy = to.y - from.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              // Offset start/end by radius so line touches node edge
              const x1 = from.x + (dx / dist) * from.radius
              const y1 = from.y + (dy / dist) * from.radius
              const x2 = to.x   - (dx / dist) * to.radius
              const y2 = to.y   - (dy / dist) * to.radius
              // Control point perpendicular offset for curve
              const mx = (x1 + x2) / 2 - dy * 0.15
              const my = (y1 + y2) / 2 + dx * 0.15

              return (
                <path
                  key={`${e.source}-${e.target}`}
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={edgeWidth(e.value)}
                  strokeOpacity={opacity}
                  markerEnd={viewMode === "pipeline" ? "url(#arrow)" : undefined}
                />
              )
            })}

            {/* ── Nodes ── */}
            {nodes.map(n => {
              const col = KIND_COLOR[n.kind]
              const isFocused = hovered === n.id || selected?.id === n.id
              const dimmed = highlightIds ? !highlightIds.has(n.id) : false
              const opacity = dimmed ? 0.25 : 1
              const r = n.radius

              return (
                <g
                  key={n.id}
                  style={{ opacity, cursor: "pointer" }}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onMouseDown={e => onNodeMouseDown(e, n)}
                >
                  {/* Outer glow ring when focused */}
                  {isFocused && (
                    <circle
                      cx={n.x} cy={n.y} r={r + 8}
                      fill="none"
                      stroke={col.fill}
                      strokeWidth={2}
                      strokeOpacity={0.4}
                      filter={`url(#glow-${n.kind})`}
                    />
                  )}

                  {/* Won arc — green arc proportional to won% */}
                  {n.value > 0 && n.won > 0 && (() => {
                    const pct = n.won / n.value
                    const angle = pct * Math.PI * 2
                    const startX = n.x + Math.cos(-Math.PI / 2) * (r + 4)
                    const startY = n.y + Math.sin(-Math.PI / 2) * (r + 4)
                    const endX   = n.x + Math.cos(-Math.PI / 2 + angle) * (r + 4)
                    const endY   = n.y + Math.sin(-Math.PI / 2 + angle) * (r + 4)
                    const large  = angle > Math.PI ? 1 : 0
                    if (pct >= 0.99) {
                      return <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke="#10b981" strokeWidth={3} strokeOpacity={0.8} />
                    }
                    return (
                      <path
                        d={`M ${startX} ${startY} A ${r + 4} ${r + 4} 0 ${large} 1 ${endX} ${endY}`}
                        fill="none" stroke="#10b981" strokeWidth={3} strokeOpacity={0.8}
                        strokeLinecap="round"
                      />
                    )
                  })()}

                  {/* Main circle */}
                  <circle
                    cx={n.x} cy={n.y} r={r}
                    fill={col.fill}
                    stroke={isFocused ? "#fff" : col.stroke}
                    strokeWidth={isFocused ? 2.5 : 1.5}
                  />

                  {/* Label inside */}
                  <text
                    x={n.x} y={n.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill={col.text}
                    fontSize={Math.max(8, Math.min(13, r * 0.42))}
                    fontWeight="600"
                    style={{ pointerEvents: "none", fontFamily: "DM Sans, sans-serif" }}
                  >
                    {n.label.length > 10 ? n.label.substring(0, 9) + "…" : n.label}
                  </text>

                  {/* External label below */}
                  {showLabels && (
                    <>
                      <text
                        x={n.x} y={n.y + r + 13}
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize={9}
                        fontWeight="500"
                        style={{ pointerEvents: "none", fontFamily: "DM Sans, sans-serif" }}
                        className="fill-foreground"
                      >
                        {fmt(n.value)}
                      </text>
                      {n.count > 1 && (
                        <text
                          x={n.x} y={n.y + r + 24}
                          textAnchor="middle"
                          fontSize={8}
                          style={{ pointerEvents: "none", fontFamily: "DM Sans, sans-serif" }}
                          className="fill-muted-foreground"
                        >
                          {n.count} deals
                        </text>
                      )}
                    </>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* ── Info card (selected node detail) ── */}
        {renderInfoCard()}

        {/* ── Empty state ── */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-3">⬡</div>
              <div className="font-medium">No data to visualise</div>
              <div className="text-sm mt-1">Import deal data then select a view mode above</div>
            </div>
          </div>
        )}

        {/* ── Zoom hint ── */}
        <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/50 pointer-events-none">
          Scroll to zoom · Drag to pan · Click node for details
        </div>

        {/* ── Zoom controls ── */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          {[{ label: "+", delta: 1.2 }, { label: "−", delta: 0.8 }].map(({ label, delta }) => (
            <button
              key={label}
              onClick={() => setTransform(prev => ({ ...prev, k: Math.max(0.2, Math.min(4, prev.k * delta)) }))}
              className="w-8 h-8 rounded-lg border bg-card text-muted-foreground hover:text-foreground hover:bg-muted text-base font-bold transition-colors shadow"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
            className="w-8 h-8 rounded-lg border bg-card text-muted-foreground hover:text-foreground hover:bg-muted text-[10px] font-bold transition-colors shadow"
          >
            ↺
          </button>
        </div>
      </div>

      {/* ── Bottom summary strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {(viewMode === "ad-product" ? USERS : []).map(u => {
          const uDeals = filtered.filter(d => d.User === u)
          const uWon   = uDeals.filter(d => d._stageSummary === "Won").reduce((s, d) => s + (d._val ?? 0), 0)
          const uPipe  = uDeals.filter(d => d._stageSummary === "Pipe").reduce((s, d) => s + (d._val ?? 0), 0)
          const uTotal = uWon + uPipe
          const pct    = uTotal ? Math.round((uWon / uTotal) * 100) : 0
          return (
            <div key={u} className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{u.split(" ")[0]}</span>
                <span className="text-xs text-muted-foreground">{uDeals.length} deals</span>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-green-500 font-medium">{fmt(uWon)} won</span>
                <span className="text-blue-400">{fmt(uPipe)} pipe</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}

        {viewMode === "pipeline" && STAGE_ORDER.map(stage => {
          const sDeals = filtered.filter(d => d.Stage === stage)
          const sVal   = sDeals.reduce((s, d) => s + (d._val ?? 0), 0)
          return (
            <div key={stage} className="rounded-lg border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground mb-1">{stage}</div>
              <div className="text-lg font-bold">{sDeals.length}</div>
              <div className="text-xs text-muted-foreground">{fmt(sVal)}</div>
            </div>
          )
        })}

        {(viewMode === "ad-elv" || viewMode === "elv-product") && (() => {
          const stats = [
            { label: "Total Deals",   val: String(filtered.length) },
            { label: "Total Value",   val: fmt(totalVal) },
            { label: "Matched ELV",   val: String(filtered.filter(d => d._elvId).length) },
            { label: "Unmatched",     val: String(filtered.filter(d => !d._elvId).length) },
          ]
          return stats.map(s => (
            <div key={s.label} className="rounded-lg border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
              <div className="text-lg font-bold">{s.val}</div>
            </div>
          ))
        })()}
      </div>
    </div>
  )
}
