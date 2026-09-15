import { useState } from 'react'

const PROFILE = {
  name: 'Miên',
  tagline: 'Builder · Tháng 8, 2026',
  avatar: 'M',
  avatarGradient: 'linear-gradient(135deg, var(--primary), var(--blue))',
  streak: 12,
  focusHours: 4.2,
  completionRate: 71,
  seasonScore: 67,
}

const STATS = [
  { label: 'Streak',      value: '12',   unit: 'ngày', color: '#f59e0b', emoji: '🔥' },
  { label: 'Focus hôm nay', value: '4.2', unit: 'giờ',  color: 'var(--primary)', emoji: '🧠' },
  { label: 'Hoàn thành',  value: '71',   unit: '%',    color: 'var(--green)', emoji: '✅' },
  { label: 'Life Score',  value: '67',   unit: '/100', color: '#3b82f6', emoji: '⭐' },
]

const PREFERENCES = [
  { icon: '🌏', label: 'Múi giờ', value: 'Asia/Ho_Chi_Minh' },
  { icon: '🕗', label: 'Giờ làm việc', value: '8:00 – 18:00' },
  { icon: '📅', label: 'Ngày làm việc', value: 'T2 – T6' },
  { icon: '🎯', label: 'Phong cách tập trung', value: '40ph + 10ph nghỉ' },
  { icon: '🌡', label: 'Ngưỡng năng lượng', value: 'Tự động theo ngày' },
]

const AI_TRUST = [
  { label: 'Đề xuất task', value: 87, color: 'var(--primary)' },
  { label: 'Lịch hoá thời gian', value: 72, color: '#3b82f6' },
  { label: 'Phân tích pattern', value: 91, color: 'var(--green)' },
]

type MeTab = 'profile' | 'prefs' | 'ai'

export function MeScreen() {
  const [tab, setTab] = useState<MeTab>('profile')

  return (
    <div className="pb-6 md:max-w-2xl">

      {/* Hero profile header */}
      <div
        className="relative px-5 pt-10 pb-6 md:px-8 overflow-hidden"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 80% 0%, var(--primary-bg) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex items-end gap-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold flex-shrink-0"
            style={{ background: PROFILE.avatarGradient, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', color: 'var(--primary-fg)' }}
          >
            {PROFILE.avatar}
          </div>
          <div className="pb-1">
            <h1
              className="text-[28px] font-bold leading-tight"
              style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}
            >
              {PROFILE.name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>{PROFILE.tagline}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-4 gap-2 mt-5">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p className="text-lg mb-0.5">{s.emoji}</p>
              <p className="text-base font-bold leading-none" style={{ color: s.color }}>
                {s.value}<span className="text-[10px] ml-0.5 font-semibold" style={{ color: 'var(--text-3)' }}>{s.unit}</span>
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Segment tabs */}
      <div className="px-4 pt-4 md:px-8">
        <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-2)', width: 'fit-content' }}>
          {([
            { id: 'profile' as MeTab, label: 'Tổng quan' },
            { id: 'prefs' as MeTab,   label: 'Tuỳ chỉnh' },
            { id: 'ai' as MeTab,      label: 'Kiểm soát AI' },
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

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="space-y-3">
            {/* Season card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>SEASON HIỆN TẠI</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>Tuần 6/13</span>
                </div>
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
                  Xây nền tảng thu nhập tự động
                </p>
                <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: 'var(--bg-2)' }}>
                  <div className="h-full rounded-full" style={{ width: '46%', background: 'linear-gradient(90deg, var(--primary), var(--blue))' }} />
                </div>
              </div>
            </div>

            {/* Weekly summary */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>TỔNG KẾT TUẦN NÀY</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Streak học tập', value: '12 ngày', good: true },
                  { label: 'Focus time tổng', value: '23.5 giờ', good: true },
                  { label: 'Task hoàn thành', value: '34/44 (77%)', good: true },
                  { label: 'Kết nối xã hội', value: 'Thấp', good: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-2)' }}>{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.good ? 'var(--green)' : 'var(--amber)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preferences tab */}
        {tab === 'prefs' && (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>TUỲ CHỈNH</p>
              </div>
              {PREFERENCES.map((pref, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: i < PREFERENCES.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span className="text-lg flex-shrink-0 w-7 text-center">{pref.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{pref.label}</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{pref.value}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 h-11 rounded-2xl font-semibold text-sm"
                style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
              >
                Xuất dữ liệu
              </button>
              <button
                className="flex-1 h-11 rounded-2xl font-semibold text-sm"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.15)' }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}

        {/* AI control tab */}
        {tab === 'ai' && (
          <div className="space-y-3">
            {/* Trust bars */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="px-4 pt-4 pb-3">
                <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>ĐỘ TIN CẬY MÔ HÌNH AI</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>Dựa trên feedback của bạn trong 30 ngày qua. Phản hồi càng nhiều, AI càng chính xác.</p>
                <div className="space-y-3">
                  {AI_TRUST.map(t => (
                    <div key={t.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{t.label}</span>
                        <span className="text-sm font-bold" style={{ color: t.color }}>{t.value}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                        <div className="h-full rounded-full" style={{ width: `${t.value}%`, background: t.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI toggles */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>QUYỀN KIỂM SOÁT</p>
              </div>
              {[
                { label: 'AI tự động đề xuất task hàng ngày', on: true },
                { label: 'AI phân tích pattern hành vi', on: true },
                { label: 'AI reschedule khi có conflict', on: false },
                { label: 'Nhận insight tuần hàng tuần', on: true },
              ].map((item, i, arr) => (
                <div key={i} className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span className="text-sm pr-4" style={{ color: 'var(--text)' }}>{item.label}</span>
                  <div
                    className="w-11 h-6 rounded-full flex-shrink-0 flex items-center px-1 cursor-pointer"
                    style={{ background: item.on ? 'var(--primary)' : 'var(--bg-2)', transition: 'background 0.2s' }}
                  >
                    <div
                      className="w-4 h-4 rounded-full bg-white"
                      style={{ transform: item.on ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--primary)' }}>
                🔒 LifeOS không gửi dữ liệu cá nhân ra ngoài. Tất cả AI chạy trên mô hình được tổng hợp ẩn danh, không nhận dạng được bạn.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
