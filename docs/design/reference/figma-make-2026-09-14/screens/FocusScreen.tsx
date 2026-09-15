import { useEffect, useState } from 'react'

const TOTAL_SECONDS = 40 * 60
const INITIAL_SECONDS = 32 * 60 + 14

const SUCCESS_ITEMS = ['Copy headline đã review', 'CTA rõ ràng, nổi bật', 'Layout mobile không bị vỡ']
const SKIP_ITEMS    = ['Xây thêm tính năng mới', 'Viết email marketing', 'Redesign logo']

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

/* Tiimo-style circular progress ring */
function TimerRing({ progress, size = 240 }: { progress: number; size?: number }) {
  const cx = size / 2, cy = size / 2
  const r = size / 2 - 14
  const circ = 2 * Math.PI * r
  const dash = (progress / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      {/* Progress arc */}
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="url(#focusGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 1s linear' }}
      />
      {/* Gradient def */}
      <defs>
        <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="50%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Tick marks (Tiimo-style) */}
      {[0, 15, 30, 45].map((min) => {
        const angle = ((min / 60) * 360 - 90) * (Math.PI / 180)
        const x1 = cx + (r - 16) * Math.cos(angle)
        const y1 = cy + (r - 16) * Math.sin(angle)
        const x2 = cx + (r + 2) * Math.cos(angle)
        const y2 = cy + (r + 2) * Math.sin(angle)
        return (
          <g key={min}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <text
              x={cx + (r - 28) * Math.cos(angle)}
              y={cy + (r - 28) * Math.sin(angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontFamily: 'Plus Jakarta Sans' }}
            >
              {min || 60}
            </text>
          </g>
        )
      })}
      {/* Center dot at progress end */}
      {progress > 0 && progress < 100 && (() => {
        const angle = ((progress / 100) * 360 - 90) * (Math.PI / 180)
        const px = cx + r * Math.cos(angle)
        const py = cy + r * Math.sin(angle)
        return <circle cx={px} cy={py} r={6} fill="white" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }} />
      })()}
    </svg>
  )
}

export function FocusScreen({ onExit }: { onExit: () => void }) {
  const [seconds, setSeconds]       = useState(INITIAL_SECONDS)
  const [paused, setPaused]         = useState(false)
  const [distraction, setDistraction] = useState('')
  const [captures, setCaptures]     = useState<string[]>([])
  const [panel, setPanel]           = useState<'context' | 'captures' | null>(null)
  const [done, setDone]             = useState(false)

  const elapsed   = TOTAL_SECONDS - seconds
  const progress  = Math.min(100, (elapsed / TOTAL_SECONDS) * 100)

  useEffect(() => {
    if (paused || seconds <= 0) return
    if (seconds === 0) { setDone(true); return }
    const id = setInterval(() => setSeconds(s => s - 1), 1000)
    return () => clearInterval(id)
  }, [paused, seconds])

  const saveCapture = () => {
    if (!distraction.trim()) return
    setCaptures(c => [...c, distraction.trim()])
    setDistraction('')
  }

  if (done) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6" style={{ background: '#07091a' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-6" style={{ background: 'var(--primary)', boxShadow: '0 12px 40px rgba(0,0,0,0.30)' }}>🎯</div>
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>Phiên hoàn thành!</h2>
        <p className="text-sm mb-8" style={{ color: '#7a8aaa' }}>40 phút · Hoàn thiện landing page Affiliate</p>
        <button onClick={onExit} className="h-12 px-8 rounded-2xl font-bold text-sm" style={{ background: 'var(--primary)', color: 'var(--primary-fg)', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
          Xem tổng kết →
        </button>
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden" style={{ background: '#06090e' }}>
      {/* Background photo */}
      <img
        src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=1400&fit=crop&auto=format"
        alt="forest"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.18 }}
      />
      {/* Gradient vignette */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,9,14,0.8) 0%, rgba(6,9,14,0.15) 35%, rgba(6,9,14,0.4) 65%, rgba(6,9,14,0.95) 100%)' }} />
      {/* Purple ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 30% at 50% 60%, rgba(109,79,187,0.18) 0%, transparent 70%)' }} />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col max-w-[420px] mx-auto px-5 overflow-hidden">

        {/* Top bar */}
        <div className="pt-12 pb-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Thoát
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'pulse 2s infinite' }} />
            <span className="text-[11px] font-bold text-green-400">FOCUS</span>
          </div>
          <button
            onClick={() => setPanel(p => p === 'context' ? null : 'context')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M12 8v4M12 16h.01" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Task name */}
        <div className="text-center mb-2 flex-shrink-0">
          <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>ĐANG LÀM</p>
          <h2 className="text-xl font-bold text-white leading-snug px-4" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
            Hoàn thiện landing page Affiliate
          </h2>
        </div>

        {/* ── CIRCULAR TIMER (Tiimo-style) ── */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 my-2">
          <div className="relative">
            <TimerRing progress={progress} size={220} />
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="text-[48px] font-bold text-white leading-none"
                style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}
              >
                {fmt(seconds)}
              </div>
              <p className="text-xs mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>PHÚT CÒN LẠI</p>
            </div>
          </div>
        </div>

        {/* Bottom half: context panel or captures or capture input */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Context panel (inline below timer) */}
          {panel === 'context' && (
            <div className="rounded-2xl p-4 mb-3 flex-shrink-0" style={{ background: 'rgba(10,14,28,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>THÀNH CÔNG KHI</p>
              {SUCCESS_ITEMS.map((c, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-xs text-white/70">{c}</span>
                </div>
              ))}
              <div className="my-3" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>KHÔNG LÀM BÂY GIỜ</p>
              {SKIP_ITEMS.map((c, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{c}</span>
                </div>
              ))}
            </div>
          )}

          {/* Captures */}
          {captures.length > 0 && (
            <button
              className="flex items-center justify-between px-4 py-2.5 rounded-2xl mb-2 flex-shrink-0"
              style={{ background: 'rgba(109,79,187,0.18)', border: '1px solid rgba(139,127,248,0.2)' }}
              onClick={() => setPanel(p => p === 'captures' ? null : 'captures')}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: '#9b8ff8' }}>
                  🧊 {captures.length} ý tưởng đã capture
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: panel === 'captures' ? 'rotate(180deg)' : '', transition: 'transform 0.2s', color: '#9b8ff8' }}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {panel === 'captures' && captures.length > 0 && (
            <div className="rounded-2xl p-3 mb-3 flex-shrink-0 space-y-1.5" style={{ background: 'rgba(10,14,28,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,127,248,0.2)' }}>
              {captures.map((c, i) => (
                <p key={i} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(139,127,248,0.1)', color: 'rgba(255,255,255,0.7)', borderLeft: '2px solid rgba(139,127,248,0.5)' }}>
                  {c}
                </p>
              ))}
            </div>
          )}

          {/* Quick capture input */}
          <div className="flex-shrink-0 mb-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-sm flex-shrink-0">💭</span>
              <input
                value={distraction}
                onChange={e => setDistraction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCapture()}
                placeholder="Ý tưởng xẹt qua? Capture ngay..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: 'rgba(255,255,255,0.7)', caretColor: 'var(--primary)' }}
              />
              {distraction && (
                <button
                  onClick={saveCapture}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(139,127,248,0.25)', color: '#c8bbff' }}
                >
                  Lưu
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-center gap-6 pb-10 flex-shrink-0">
          {/* Note */}
          <button className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>Ghi chú</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setPaused(p => !p)}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
            style={{
              background: paused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.10)',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {paused ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M8 5l13 7-13 7V5z"/></svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="5" width="4" height="14" rx="1"/>
                <rect x="14" y="5" width="4" height="14" rx="1"/>
              </svg>
            )}
          </button>

          {/* End */}
          <button onClick={() => setDone(true)} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>Kết thúc</span>
          </button>
        </div>
      </div>
    </div>
  )
}
