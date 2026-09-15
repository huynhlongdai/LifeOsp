import React, { useState, useEffect } from 'react'
import { NowScreen } from './screens/NowScreen'
import { DirectionScreen } from './screens/DirectionScreen'
import { FocusScreen } from './screens/FocusScreen'
import { BrainDumpModal } from './screens/BrainDumpModal'
import { ExecuteScreen } from './screens/ExecuteScreen'
import { ReflectScreen } from './screens/ReflectScreen'
import { MeScreen } from './screens/MeScreen'
import { AICoachScreen } from './screens/AICoachScreen'
import { InboxScreen } from './screens/InboxScreen'
import { IncubatorScreen } from './screens/IncubatorScreen'

export type Tab = 'now' | 'direction' | 'execute' | 'reflect' | 'me' | 'inbox' | 'incubator' | 'library' | 'aicoach' | 'settings'

type NavDef = { id: Tab; label: string; icon: (a: boolean) => React.ReactElement }

const NAV_PRIMARY: NavDef[] = [
  {
    id: 'now', label: 'NOW',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.5" fill={a ? 'var(--nav-icon-active)' : 'none'} stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="8.5" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    id: 'direction', label: 'DIR',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <polygon points="12,2.5 21.5,20.5 12,16.5 2.5,20.5" fill={a ? 'var(--nav-icon-active)' : 'none'} stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'execute', label: 'EXECUTE',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={a ? 'var(--nav-icon-active)' : 'none'} stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={a ? 'var(--nav-icon-active)' : 'none'} stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="none" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="none" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'reflect', label: 'REFLECT',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.8A9.5 9.5 0 1111.2 3 7.3 7.3 0 0021 12.8z" fill={a ? 'var(--nav-icon-active)' : 'none'} stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'me', label: 'ME',
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8.5" r="4" fill={a ? 'var(--nav-icon-active)' : 'none'} stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" />
        <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

const NAV_SECONDARY: NavDef[] = [
  {
    id: 'inbox', label: 'Inbox',
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M22 12H17l-2 3H9l-2-3H2" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    id: 'incubator', label: 'Incubator',
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" />
        <path d="M9 21h6" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'library', label: 'Library',
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    id: 'aicoach', label: 'AI Coach',
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 4V4a2 2 0 012-2h8z" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M18 8a2 2 0 012 2v8l-4-4h-4a2 2 0 01-2-2" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Cài đặt',
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" />
        <path d="M10.3 3.2a2 2 0 013.4 0l.5.9a2 2 0 001.7 1l1-.1a2 2 0 011.7 3l-.5.9a2 2 0 000 2l.5.9a2 2 0 01-1.7 3l-1-.1a2 2 0 00-1.7 1l-.5.9a2 2 0 01-3.4 0l-.5-.9a2 2 0 00-1.7-1l-1 .1a2 2 0 01-1.7-3l.5-.9a2 2 0 000-2l-.5-.9a2 2 0 011.7-3l1 .1a2 2 0 001.7-1l.5-.9z" stroke={a ? 'var(--nav-icon-active)' : 'var(--text-3)'} strokeWidth="1.7" />
      </svg>
    ),
  },
]

function SidebarItem({ def, active, onClick }: { def: NavDef; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'sidebar-active' : ''}`}
      style={{
        background: active ? undefined : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-2)',
        fontWeight: active ? '800' : '600',
        fontFamily: "'Nunito', sans-serif",
        border: active ? undefined : '1px solid transparent',
      }}
    >
      <span className="flex-shrink-0">{def.icon(active)}</span>
      <span>{def.label}</span>
      {def.id === 'inbox' && (
        <span className="ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>3</span>
      )}
    </button>
  )
}

function BottomNavItem({ def, active, onClick }: { def: NavDef; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0 relative"
      style={{ paddingTop: 10, paddingBottom: 10 }}
    >
      <span className="flex flex-col items-center gap-1 transition-all" style={{ transform: active ? 'translateY(-1px)' : 'translateY(0)' }}>
        {def.icon(active)}
        <span
          className="text-[9px] font-extrabold tracking-wider"
          style={{ color: active ? 'var(--text)' : 'var(--text-3)', fontFamily: "'Nunito', sans-serif" }}
        >
          {def.label}
        </span>
      </span>
      {active && (
        <span
          className="absolute rounded-full"
          style={{ bottom: 6, width: 6, height: 6, background: 'var(--accent)', border: '1.5px solid var(--text)' }}
        />
      )}
    </button>
  )
}

type ThemeId = 'wellness' | 'futuristic' | 'toycad'
const THEME_CYCLE: ThemeId[] = ['wellness', 'futuristic', 'toycad']

function ThemeToggle({ theme, onCycle }: { theme: ThemeId; onCycle: () => void }) {
  return (
    <button
      onClick={onCycle}
      className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl transition-all"
      style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
      title={`Theme: ${theme}`}
    >
      {theme === 'wellness' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 22C17.523 22 22 17.523 22 12S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/>
        </svg>
      )}
      {theme === 'futuristic' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {theme === 'toycad' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor"/>
        </svg>
      )}
      <span className="text-[10px] font-extrabold uppercase" style={{ letterSpacing: '0.06em', color: 'var(--primary)' }}>
        {theme === 'wellness' ? 'W' : theme === 'futuristic' ? 'FH' : 'TC'}
      </span>
    </button>
  )
}

function PageContent({ tab, onStartFocus, onTabChange }: { tab: Tab; onStartFocus: () => void; onTabChange: (t: Tab) => void }) {
  let content: React.ReactElement | null = null
  switch (tab) {
    case 'now': content = <NowScreen onStartFocus={onStartFocus} onOpenIncubator={() => onTabChange('incubator')} />; break
    case 'direction': content = <DirectionScreen />; break
    case 'execute': content = <ExecuteScreen />; break
    case 'reflect': content = <ReflectScreen />; break
    case 'me': content = <MeScreen />; break
    case 'aicoach': content = <AICoachScreen />; break
    case 'inbox': content = <InboxScreen />; break
    case 'incubator': content = <IncubatorScreen />; break
    case 'library': content = <PlaceholderScreen title="Library" desc="Tài liệu tham khảo và kiến thức đã lưu." icon="📚" />; break
    case 'settings': content = <PlaceholderScreen title="Cài đặt" desc="Cấu hình LifeOS theo cách bạn muốn." icon="⚙️" />; break
    default: content = null
  }
  return (
    <div key={tab} className="page-enter">
      {content}
    </div>
  )
}

function PlaceholderScreen({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="px-5 pt-8 pb-6 md:px-8 md:pt-10">
      <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>{title.toUpperCase()}</p>
      <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
        {title}
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-2)' }}>{desc}</p>
      <div className="rounded-2xl p-14 flex flex-col items-center justify-center gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--bg-2)' }}>{icon}</div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Sắp ra mắt</p>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('now')
  const [brainDump, setBrainDump] = useState(false)
  const [focusing, setFocusing] = useState(false)
  const [theme, setTheme] = useState<ThemeId>('wellness')

  useEffect(() => {
    const map: Record<ThemeId, string> = { wellness: 'light', futuristic: 'futuristic', toycad: 'dark' }
    document.documentElement.setAttribute('data-theme', map[theme])
  }, [theme])

  const cycleTheme = () => setTheme(t => {
    const idx = THEME_CYCLE.indexOf(t)
    return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]
  })

  if (focusing) {
    return <FocusScreen onExit={() => setFocusing(false)} />
  }

  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-full overflow-y-auto"
        style={{ width: 236, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo + theme toggle */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--logo-bg)', boxShadow: '0 4px 14px rgba(0,0,0,0.20)' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--logo-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <span className="text-[16px] block leading-none" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>LifeOS</span>
              <span className="text-[9px] font-extrabold tracking-widest" style={{ color: 'var(--text-3)', fontFamily: "'Nunito', sans-serif" }}>BETA</span>
            </div>
          </div>
          <ThemeToggle theme={theme} onCycle={cycleTheme} />
        </div>

        {/* Date chip */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>27</div>
            <div>
              <p className="text-xs font-semibold leading-none mb-0.5" style={{ color: 'var(--text)' }}>Thứ Năm</p>
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Tháng 8, 2026</p>
            </div>
          </div>
        </div>

        {/* Primary nav */}
        <div className="px-4 mb-1 flex-shrink-0">
          <p className="text-[9px] font-extrabold tracking-widest" style={{ color: 'var(--text-3)', letterSpacing: '0.14em' }}>TỔNG QUAN</p>
        </div>
        <nav className="px-3 space-y-0.5 flex-shrink-0">
          {NAV_PRIMARY.map((def) => (
            <SidebarItem key={def.id} def={def} active={tab === def.id} onClick={() => setTab(def.id)} />
          ))}
        </nav>

        <div className="mx-4 mt-4 mb-1 flex-shrink-0">
          <p className="text-[9px] font-extrabold tracking-widest" style={{ color: 'var(--text-3)', letterSpacing: '0.14em' }}>CÔNG CỤ</p>
        </div>

        {/* Secondary nav */}
        <nav className="px-3 space-y-0.5 flex-1">
          {NAV_SECONDARY.map((def) => (
            <SidebarItem key={def.id} def={def} active={tab === def.id} onClick={() => setTab(def.id)} />
          ))}
        </nav>

        {/* Brain Dump button */}
        <div className="px-3 py-2 flex-shrink-0">
          <button
            onClick={() => setBrainDump(true)}
            className="btn-primary-action flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-[0.98]"
          >
            <span className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </span>
            Brain Dump
            <span className="ml-auto text-[10px] opacity-50">⌘ K</span>
          </button>
        </div>

        {/* Profile footer */}
        <div className="px-3 pb-4 pt-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:opacity-80" style={{ background: 'var(--bg)' }}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--blue))', color: 'var(--primary-fg)' }}
            >M</div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text)' }}>Miên</p>
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Builder · Streak 🔥12</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="md:hidden flex-shrink-0 flex items-center justify-between px-4"
          style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--logo-bg)', boxShadow: '0 3px 10px rgba(0,0,0,0.20)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--logo-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[16px]" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>LifeOS</span>
          </div>
          <ThemeToggle theme={theme} onCycle={cycleTheme} />
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto pb-[72px] md:pb-0">
          <PageContent tab={tab} onStartFocus={() => setFocusing(true)} onTabChange={setTab} />
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden flex-shrink-0 flex z-20"
          style={{ height: 72, background: 'var(--surface)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}
        >
          {NAV_PRIMARY.map((def) => (
            <BottomNavItem key={def.id} def={def} active={tab === def.id} onClick={() => setTab(def.id)} />
          ))}
        </nav>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setBrainDump(true)}
        aria-label="Brain Dump"
        className="md:hidden fixed z-30 flex items-center justify-center rounded-2xl"
        style={{ bottom: 82, right: 16, width: 46, height: 46, background: 'var(--logo-bg)', boxShadow: '0 6px 20px rgba(0,0,0,0.20)' }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="var(--logo-fg)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {brainDump && <BrainDumpModal onClose={() => setBrainDump(false)} />}
    </div>
  )
}
