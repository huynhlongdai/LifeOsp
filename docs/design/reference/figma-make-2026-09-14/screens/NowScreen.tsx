import { useState } from 'react'

interface Props {
  onStartFocus: () => void
  onOpenIncubator: () => void
}

const TIER_COLOR: Record<string, string> = {
  direct:     'var(--green)',
  pattern:    'var(--primary)',
  hypothesis: '#d97706',
}
const TIER_BG: Record<string, string> = {
  direct:     'var(--green-bg)',
  pattern:    'var(--primary-bg)',
  hypothesis: 'rgba(217,119,6,0.10)',
}
const TIER_LABEL: Record<string, string> = {
  direct:     'Bằng chứng',
  pattern:    'Mẫu hành vi',
  hypothesis: 'Giả thuyết',
}

const recommendation = {
  task: 'Hoàn thiện landing page Affiliate',
  project: 'Affiliate Automation',
  duration: '40 phút',
  avatar: '🚀',
  successCondition: 'Copy đã review, CTA rõ ràng, layout mobile ổn.',
  notToDo: 'Không check email hay Slack trong lúc này.',
  evidence: [
    { tier: 'direct',     text: 'Deadline pitch tuần tới — landing page chưa xong.' },
    { tier: 'pattern',    text: 'Thứ Năm sáng thường là peak energy của bạn.' },
    { tier: 'pattern',    text: '3 tuần gần nhất bạn hay bị phân tâm sau 11h.' },
    { tier: 'hypothesis', text: 'Bắt đầu bằng task có deadline giúp bạn vào flow nhanh hơn.' },
  ],
}

const THEN_ITEMS = [
  'Kiểm tra lại copy headline',
  'Test mobile layout trên iPhone',
  'Chạy Lighthouse performance check',
]

const PARKED = [
  { label: 'LifeOS architecture',      category: 'Incubate', color: '#d97706', bg: 'rgba(217,119,6,0.09)' },
  { label: 'Garden AI',                category: 'Incubate', color: '#d97706', bg: 'rgba(217,119,6,0.09)' },
  { label: 'Viết blog tech hàng tuần', category: 'Not Now',  color: 'var(--text-3)', bg: 'var(--bg-2)' },
  { label: 'Học tiếng Nhật',           category: 'Not Now',  color: 'var(--text-3)', bg: 'var(--bg-2)' },
]

export function NowScreen({ onStartFocus, onOpenIncubator }: Props) {
  const [checked, setChecked]   = useState<number[]>([])
  const [whyOpen, setWhyOpen]   = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [resolved, setResolved] = useState<'notNow' | 'wrong' | null>(null)

  const toggleCheck = (i: number) =>
    setChecked(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])

  return (
    <div className="pb-8 md:max-w-2xl">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div
        className="hero-now relative overflow-hidden"
        style={{ paddingTop: 36, paddingBottom: 36, paddingLeft: 20, paddingRight: 20 }}
      >
        {/* Doodle — crown top-left */}
        <svg className="absolute pointer-events-none" style={{ top: 14, left: 16, opacity: 0.18 }} width="36" height="28" viewBox="0 0 36 28" fill="none">
          <path d="M2 26L9 6L18 15L27 6L34 26H2Z" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round"/>
          <circle cx="9" cy="5" r="2.5" fill="var(--text)" opacity="0.5"/>
          <circle cx="18" cy="14" r="2.5" fill="var(--text)" opacity="0.5"/>
          <circle cx="27" cy="5" r="2.5" fill="var(--text)" opacity="0.5"/>
        </svg>

        {/* Doodle — 6-pointed star top-right */}
        <svg className="absolute pointer-events-none" style={{ top: 16, right: 20, opacity: 0.22 }} width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path d="M17 2L20.5 12.5H32L22.5 19L26 29.5L17 23L8 29.5L11.5 19L2 12.5H13.5L17 2Z" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>

        {/* Doodle — small star mid-right */}
        <svg className="absolute pointer-events-none" style={{ top: 62, right: 60, opacity: 0.14 }} width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1L11 7H17L12 10.5L14 17L9 13L4 17L6 10.5L1 7H7L9 1Z" fill="var(--text)"/>
        </svg>

        {/* Doodle — lightning bolt bottom-right */}
        <svg className="absolute pointer-events-none" style={{ bottom: 20, right: 28, opacity: 0.13 }} width="22" height="36" viewBox="0 0 22 36" fill="none">
          <path d="M13 2L3 20H12L9 34L21 14H11L13 2Z" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>

        {/* Doodle — dots cluster bottom-left */}
        <div className="absolute pointer-events-none" style={{ bottom: 28, left: 22, opacity: 0.18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--text)' }}/>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text)', opacity: 0.4 }}/>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text)', opacity: 0.25 }}/>
        </div>

        {/* Date + energy badge */}
        <div className="relative z-10 flex items-center justify-between mb-5">
          <p className="text-xs font-extrabold tracking-widest" style={{ color: 'var(--text-3)', letterSpacing: '0.14em', fontFamily: "'Nunito', sans-serif" }}>
            THỨ NĂM · 27/8
          </p>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--green-bg)', border: '1.5px solid var(--border-2)' }}
          >
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--green)' }} />
              <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: 'var(--green)' }} />
            </span>
            <span className="text-[11px] font-extrabold" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif" }}>Peak energy ⚡</span>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="relative z-10 mb-2"
          style={{
            fontFamily: "'Nunito', sans-serif", fontWeight: '900',
            fontSize: 'clamp(58px, 13vw, 78px)',
            lineHeight: 0.87,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
            textTransform: 'uppercase',
          }}
        >
          NGAY<br/>BÂY GIỜ.
        </h1>
        <p className="relative z-10" style={{ fontFamily: "'Caveat', cursive", fontSize: 21, fontWeight: 600, color: 'var(--text-2)' }}>
          Chỉ một việc. Làm tốt nhất có thể.
        </p>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      <div className="px-4 pt-5 md:px-6">

        {/* TASK CARD */}
        {resolved === null ? (
          <>
            {/* Gradient border wrapper */}
            <div
              className="card-gradient-border rounded-[26px] p-px mb-5"
              style={{ boxShadow: 'var(--shadow-raise)' }}
            >
              <div className="rounded-[25px] overflow-hidden" style={{ background: 'var(--card)' }}>

                {/* Card header */}
                <div className="px-5 pt-5 pb-4 flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 6px 24px rgba(245,158,11,0.32)' }}
                  >
                    {recommendation.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[9px] font-extrabold tracking-widest mb-1" style={{ color: 'var(--text-3)', letterSpacing: '0.12em' }}>
                          ĐỀ XUẤT AI
                        </p>
                        <h2
                          className="text-xl leading-snug"
                          style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}
                        >
                          {recommendation.task}
                        </h2>
                      </div>
                      <button
                        onClick={() => setMenuOpen(m => !m)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-5"
                        style={{ background: 'var(--bg)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                        </svg>
                      </button>
                    </div>

                    {/* Meta badges */}
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                        {recommendation.project}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2"/>
                          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                        </svg>
                        9:00 – 9:40
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(55,65,81,0.06)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                        <span className="font-mono text-[10px]">N</span> Notion
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overflow menu */}
                {menuOpen && (
                  <div className="mx-5 mb-3 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {[
                      { label: 'Tại sao việc này?', icon: '🔍', action: () => { setWhyOpen(true); setMenuOpen(false) } },
                      { label: 'Chỉnh sửa task',    icon: '✏️', action: () => setMenuOpen(false) },
                      { label: 'Not Now',            icon: '⏸', action: () => { setResolved('notNow'); setMenuOpen(false) } },
                      { label: 'Sai giả định',       icon: '❌', action: () => { setResolved('wrong'); setMenuOpen(false) } },
                    ].map((item, i, arr) => (
                      <button
                        key={i}
                        onClick={item.action}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:opacity-80"
                        style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--text-2)' }}
                      >
                        <span className="text-base">{item.icon}</span>{item.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Condition blocks */}
                <div className="px-5 pb-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="px-3.5 py-3.5 rounded-2xl" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.16)' }}>
                      <p className="text-[9px] font-extrabold tracking-widest mb-1.5 flex items-center gap-1" style={{ color: 'var(--green)' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        THÀNH CÔNG KHI
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{recommendation.successCondition}</p>
                    </div>
                    <div className="px-3.5 py-3.5 rounded-2xl" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.13)' }}>
                      <p className="text-[9px] font-extrabold tracking-widest mb-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/></svg>
                        KHÔNG LÀM
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{recommendation.notToDo}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <button
                    onClick={onStartFocus}
                    className="btn-primary-action w-full h-14 rounded-2xl flex items-center justify-between px-5 active:scale-[0.97]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-[15px] font-black" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>
                        Bắt đầu Focus Session
                      </span>
                      <span className="text-xs opacity-50 font-bold">40 ph</span>
                    </span>
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </button>

                  <button
                    onClick={() => setWhyOpen(true)}
                    className="w-full h-10 rounded-xl font-semibold text-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    Tại sao task này? →
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl p-7 mb-5 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-4xl mb-3">{resolved === 'notNow' ? '⏸' : '🙏'}</p>
            <p className="text-xl mb-1" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
              {resolved === 'notNow' ? 'Đã bỏ qua.' : 'Cảm ơn!'}
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
              {resolved === 'notNow' ? 'LifeOS sẽ học và đề xuất lại.' : 'LifeOS sẽ học từ phản hồi này.'}
            </p>
            <button onClick={() => setResolved(null)} className="text-sm font-bold px-5 py-2.5 rounded-xl" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
              Xem lại đề xuất
            </button>
          </div>
        )}

        {/* CHECKLIST */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-widest" style={{ color: 'var(--text-3)', letterSpacing: '0.12em' }}>
                TRONG PHIÊN NÀY
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: checked.length === THEN_ITEMS.length ? 'var(--green-bg)' : 'var(--primary-bg)', color: checked.length === THEN_ITEMS.length ? 'var(--green)' : 'var(--primary)' }}
              >
                {checked.length}/{THEN_ITEMS.length}
              </span>
            </div>
            {checked.length === THEN_ITEMS.length && (
              <span className="text-xs font-bold" style={{ color: 'var(--green)' }}>✓ Xong rồi!</span>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            {THEN_ITEMS.map((item, i) => (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className="flex items-center gap-4 w-full px-4 py-4 text-left group"
                style={{ borderBottom: i < THEN_ITEMS.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <span
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{
                    border: checked.includes(i) ? 'none' : '2px solid var(--border-2)',
                    background: checked.includes(i) ? 'var(--primary)' : 'transparent',
                    boxShadow: 'none',
                  }}
                >
                  {checked.includes(i) && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span
                  className="text-sm font-medium leading-snug flex-1"
                  style={{
                    color: checked.includes(i) ? 'var(--text-3)' : 'var(--text)',
                    textDecoration: checked.includes(i) ? 'line-through' : 'none',
                  }}
                >
                  {item}
                </span>
                {!checked.includes(i) && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--border-2)', flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* PARKED IDEAS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold tracking-widest" style={{ color: 'var(--text-3)', letterSpacing: '0.12em' }}>
              ĐỪNG NGHĨ BÂY GIỜ · {PARKED.length}
            </span>
            <button onClick={onOpenIncubator} className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
              Xem tất cả →
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            {PARKED.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 px-4 py-3.5"
                style={{ borderBottom: i < PARKED.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-sm flex-1 font-medium" style={{ color: 'var(--text-2)' }}>{item.label}</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: item.bg, color: item.color }}>
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHY SHEET */}
      {whyOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center" onClick={() => setWhyOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(8px)' }} />
          <div
            className="relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3.5 pb-0 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-2)' }} />
            </div>
            <div className="px-5 pb-7 pt-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[9px] font-extrabold tracking-widest mb-0.5" style={{ color: 'var(--text-3)' }}>GIẢI THÍCH AI</p>
                  <h3 className="text-xl" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
                    Tại sao task này?
                  </h3>
                </div>
                <button onClick={() => setWhyOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-2)', color: 'var(--text-2)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-2.5">
                {recommendation.evidence.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span
                      className="text-[9px] font-extrabold px-2 py-1 rounded-lg mt-0.5 flex-shrink-0 tracking-wide"
                      style={{ background: TIER_BG[ev.tier], color: TIER_COLOR[ev.tier] }}
                    >
                      {TIER_LABEL[ev.tier]}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{ev.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--primary)' }}>
                  💡 LifeOS chỉ đề xuất — bạn luôn là người quyết định. Phản hồi giúp AI học tốt hơn.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
