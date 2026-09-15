// ─── Weekly Review ──────────────────────────────────────────────
import { useState } from 'react'

/* Lifestack-style: hourly energy data for the day */
const HOURLY_ENERGY = [
  { hour: '6', level: 0.3 }, { hour: '7', level: 0.55 }, { hour: '8', level: 0.75 },
  { hour: '9', level: 0.92 }, { hour: '10', level: 0.88 }, { hour: '11', level: 0.70 },
  { hour: '12', level: 0.45 }, { hour: '13', level: 0.30 }, { hour: '14', level: 0.52 },
  { hour: '15', level: 0.68 }, { hour: '16', level: 0.62 }, { hour: '17', level: 0.48 },
  { hour: '18', level: 0.35 }, { hour: '19', level: 0.25 }, { hour: '20', level: 0.18 },
]

const energyColor = (v: number) =>
  v >= 0.8 ? '#22c55e' : v >= 0.55 ? '#a3e635' : v >= 0.35 ? '#f59e0b' : '#f87171'

/* Reclaim-style: week day data */
const WEEK_DAYS = [
  { day: 'T2', focus: 3.5, meetings: 1.5, admin: 1.0, done: 9, total: 11 },
  { day: 'T3', focus: 4.2, meetings: 2.0, admin: 0.5, done: 11, total: 12 },
  { day: 'T4', focus: 2.8, meetings: 3.0, admin: 0.5, done: 7, total: 10 },
  { day: 'T5', focus: 5.1, meetings: 0.5, admin: 1.0, done: 8, total: 12 },
  { day: 'T6', focus: 3.0, meetings: 1.0, admin: 2.0, done: 6, total: 9 },
]

/* Lifestack: Life areas */
const LIFE_AREAS = [
  { name: 'Deep Work', pct: 52, color: 'var(--primary)', emoji: '🧠' },
  { name: 'Learning',  pct: 22, color: '#3b82f6', emoji: '📚' },
  { name: 'Admin',     pct: 14, color: '#f59e0b', emoji: '📋' },
  { name: 'Other',     pct: 12, color: '#a8a6a8', emoji: '💬' },
]

/* Reclaim: Habit tracking */
const HABITS = [
  { name: 'Deep work 4h+', streak: 4, days: [1,1,0,1,1,1,1], color: 'var(--primary)' },
  { name: 'Không check email trước 10h', streak: 3, days: [1,1,1,0,1,1,0], color: '#3b82f6' },
  { name: 'Brain Dump buổi tối', streak: 7, days: [1,1,1,1,1,1,1], color: '#22c55e' },
  { name: 'Review hàng tuần', streak: 2, days: [0,1,0,0,1,0,1], color: '#f59e0b' },
]

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

type ReflectTab = 'week' | 'energy' | 'habits'

function EnergyTimeline() {
  const max = Math.max(...HOURLY_ENERGY.map(h => h.level))
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>NĂNG LƯỢNG HÔM NAY</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>Peak: 9:00 – 11:00 sáng</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'var(--green-bg)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold" style={{ color: 'var(--green)' }}>+8% vs. tuần trước</span>
        </div>
      </div>
      {/* Bar chart */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-1" style={{ height: 72 }}>
          {HOURLY_ENERGY.map(({ hour, level }) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: `${(level / max) * 56}px`,
                  background: energyColor(level),
                  opacity: level > 0.7 ? 1 : 0.55,
                  minHeight: 4,
                }}
              />
              <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{hour}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {[
            { color: '#22c55e', label: 'Rất cao' },
            { color: '#a3e635', label: 'Cao' },
            { color: '#f59e0b', label: 'Trung bình' },
            { color: '#f87171', label: 'Thấp' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WeekCapacity() {
  const totalFocus = WEEK_DAYS.reduce((s, d) => s + d.focus, 0)
  const totalDone = WEEK_DAYS.reduce((s, d) => s + d.done, 0)
  const totalTasks = WEEK_DAYS.reduce((s, d) => s + d.total, 0)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>PHÂN BỔ THỜI GIAN · TUẦN NÀY</p>
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Focus', value: `${totalFocus.toFixed(1)}h`, color: 'var(--primary)' },
            { label: 'Task xong', value: `${totalDone}/${totalTasks}`, color: 'var(--green)' },
            { label: 'Hiệu suất', value: `${Math.round((totalDone/totalTasks)*100)}%`, color: 'var(--amber)' },
          ].map(s => (
            <div key={s.label} className="text-center px-2 py-2 rounded-xl" style={{ background: 'var(--bg)' }}>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Stacked day bars (Reclaim-style) */}
        <div className="flex items-end gap-2" style={{ height: 80 }}>
          {WEEK_DAYS.map(d => {
            const maxH = 64
            const total = d.focus + d.meetings + d.admin
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end rounded-t overflow-hidden" style={{ height: maxH }}>
                  <div style={{ height: `${(d.admin / total) * maxH}px`, background: '#f59e0b', opacity: 0.7 }} />
                  <div style={{ height: `${(d.meetings / total) * maxH}px`, background: '#3b82f6', opacity: 0.7 }} />
                  <div style={{ height: `${(d.focus / total) * maxH}px`, background: 'var(--primary)' }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>{d.day}</span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-4 mt-2">
          {[
            { color: 'var(--primary)', label: 'Focus' },
            { color: '#3b82f6', label: 'Meetings' },
            { color: '#f59e0b', label: 'Admin' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Life area donut row */}
      <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[10px] font-bold tracking-widest mb-2 pt-2" style={{ color: 'var(--text-3)' }}>PHÂN BỔ THEO LĨNH VỰC</p>
        <div className="flex items-center gap-3">
          {/* Mini SVG donut */}
          <svg width="52" height="52" viewBox="0 0 52 52" className="flex-shrink-0">
            {(() => {
              const r = 20; const cx = 26; const cy = 26
              const circ = 2 * Math.PI * r
              let offset = 0
              return LIFE_AREAS.map(a => {
                const dash = (a.pct / 100) * circ
                const el = (
                  <circle
                    key={a.name}
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={a.color}
                    strokeWidth="10"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeDashoffset={-offset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px' }}
                  />
                )
                offset += dash
                return el
              })
            })()}
          </svg>
          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1">
            {LIFE_AREAS.map(a => (
              <div key={a.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>{a.emoji} {a.name}</span>
                <span className="text-[11px] font-bold ml-auto" style={{ color: a.color }}>{a.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function HabitTracker() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-4 pt-4 pb-0">
        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>HABITS · TUẦN NÀY</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>Được theo dõi tự động bởi LifeOS</p>
      </div>
      <div>
        {HABITS.map((habit, i) => (
          <div key={habit.name} className="px-4 py-3" style={{ borderBottom: i < HABITS.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: habit.color }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{habit.name}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'var(--green-bg)' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="var(--green)" />
                </svg>
                <span className="text-[10px] font-bold" style={{ color: 'var(--green)' }}>{habit.streak}d</span>
              </div>
            </div>
            {/* Day dots (Reclaim-style) */}
            <div className="flex gap-1.5">
              {habit.days.map((done, j) => (
                <div key={j} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: done ? `${habit.color}22` : 'var(--bg-2)', border: `1.5px solid ${done ? habit.color : 'var(--border)'}` }}
                  >
                    {done ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L20 7" stroke={habit.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border-2)' }} />
                    )}
                  </div>
                  <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>{WEEK_LABELS[j]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReflectScreen() {
  const [tab, setTab] = useState<ReflectTab>('week')

  return (
    <div className="pb-6 md:max-w-3xl">
      {/* Hero header */}
      <div className="hero-reflect relative overflow-hidden px-5 pt-9 pb-5 md:px-8">
        {/* Doodle decorations */}
        <svg className="absolute pointer-events-none" style={{ top: 12, right: 22, opacity: 0.20 }} width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 2L19 11H28L21 17L24 26L16 20L8 26L11 17L4 11H13L16 2Z" stroke="var(--text)" strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
        <svg className="absolute pointer-events-none" style={{ top: 48, right: 64, opacity: 0.12 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="var(--text)" strokeWidth="1.5"/>
          <circle cx="8" cy="8" r="2" fill="var(--text)" opacity="0.5"/>
        </svg>
        <div className="relative z-10">
          <p className="text-[9px] font-extrabold tracking-widest mb-1.5" style={{ color: 'var(--text-3)', letterSpacing: '0.14em', fontFamily: "'Nunito', sans-serif" }}>REFLECT</p>
          <h1 className="text-[48px] leading-none mb-1.5" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', textTransform: 'uppercase' }}>
            NHÌN LẠI
          </h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-3)', fontFamily: "'Caveat', cursive", fontSize: 17 }}>Tuần 27/8 – 2/9, 2026</p>
        </div>
      </div>
      <div className="px-4 pt-4 md:px-8">

      {/* Segment control */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-2)', width: 'fit-content' }}>
        {([
          { id: 'week' as ReflectTab, label: 'Tuần' },
          { id: 'energy' as ReflectTab, label: 'Năng lượng' },
          { id: 'habits' as ReflectTab, label: 'Habits' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: tab === id ? 'var(--card)' : 'transparent',
              color: tab === id ? 'var(--text)' : 'var(--text-3)',
              boxShadow: tab === id ? 'var(--shadow-card)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'week' && (
        <div className="space-y-3">
          <WeekCapacity />

          {/* Wins & challenges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--green)' }}>THÀNH TỰU</p>
              {['Hoàn thành Affiliate page draft', 'Streak Brain Dump 7 ngày'].map((w, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: 'var(--green-bg)' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L20 7" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{w}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--red)' }}>CẦN CẢI THIỆN</p>
              {['Thứ Tư quá nhiều meetings', 'Review email buổi chiều'].map((w, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: 'var(--red-bg)' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8v5M12 16h.01" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{w}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Weekly Insight (Sunsama-style) */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="var(--primary-fg)" />
                </svg>
              </div>
              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--primary)' }}>AI INSIGHT</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              Tuần này bạn đạt <strong>52% deep work</strong> — cao hơn 8% so với trung bình. Peak performance vào 9–11h sáng. Hãy bảo vệ khung giờ này tuần tới bằng cách block calendar.
            </p>
          </div>
        </div>
      )}

      {tab === 'energy' && (
        <div className="space-y-3">
          <EnergyTimeline />
          {/* Insights */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>KHUYẾN NGHỊ LỊCH LÀM VIỆC</p>
            {[
              { time: '6:00 – 8:00', type: 'Khởi động', color: '#f59e0b', desc: 'Email, admin, planning' },
              { time: '9:00 – 11:30', type: 'Deep Work', color: 'var(--primary)', desc: 'Task quan trọng nhất ngày' },
              { time: '12:00 – 13:00', type: 'Nghỉ ngơi', color: '#22c55e', desc: 'Ăn trưa, đi bộ' },
              { time: '14:00 – 17:00', type: 'Focus 2', color: '#3b82f6', desc: 'Task thứ 2, meetings nhẹ' },
            ].map((block, i) => (
              <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: block.color }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{block.time}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${block.color}18`, color: block.color }}>{block.type}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>{block.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'habits' && <HabitTracker />}
      </div>{/* end padding wrapper */}
    </div>
  )
}
