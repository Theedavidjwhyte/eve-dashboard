import { useState, useEffect } from "react"
import { Lock, Eye, EyeOff, Zap } from "lucide-react"

const PASSWORD = "Elevate2026"
const STORAGE_KEY = "eve_auth"

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === PASSWORD) setAuthed(true)
    } catch { /* ignore */ }
    setChecking(false)
  }, [])

  if (checking) return null
  if (authed) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === PASSWORD) {
      try { localStorage.setItem(STORAGE_KEY, PASSWORD) } catch { /* ignore */ }
      setAuthed(true)
    } else {
      setError(true)
      setShake(true)
      setInput("")
      setTimeout(() => setShake(false), 600)
      setTimeout(() => setError(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">E.V.E</h1>
          <p className="text-muted-foreground text-sm mt-1">Elevate Value Add Engine</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Secure Access
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Password
              </label>
              <div
                className={`relative transition-all duration-150 ${shake ? "animate-shake" : ""}`}
              >
                <input
                  type={show ? "text" : "password"}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Enter password..."
                  autoFocus
                  className={`w-full h-11 px-4 pr-10 rounded-lg border text-sm bg-background text-foreground
                    caret-primary outline-none transition-all
                    ${error
                      ? "border-destructive ring-1 ring-destructive"
                      : "border-border focus:border-primary focus:ring-1 focus:ring-primary"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-destructive text-xs mt-1.5 font-medium">
                  Incorrect password. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm
                hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Enter E.V.E
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Access Group · HOS Elevate Team · FY26
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) }
          20% { transform: translateX(-8px) }
          40% { transform: translateX(8px) }
          60% { transform: translateX(-6px) }
          80% { transform: translateX(6px) }
        }
        .animate-shake { animation: shake 0.5s ease-in-out }
      `}</style>
    </div>
  )
}

export function useSignOut() {
  return () => {
    try { localStorage.removeItem("eve_auth") } catch { /* ignore */ }
    window.location.reload()
  }
}
