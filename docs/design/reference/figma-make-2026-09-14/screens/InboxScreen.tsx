import { useState } from 'react'

type CaptureStatus = 'pending' | 'processing' | 'reviewed'

interface Capture {
  id: string
  text: string
  createdAt: string
  timeLabel: string
  status: CaptureStatus
  tags?: string[]
  aiNote?: string
  routed?: string
}

const CAPTURES: Capture[] = [
  { id: '1', text: 'Tôi muốn kiếm thêm thu nhập online, có thể qua affiliate hoặc dịch vụ freelance.', createdAt: 'Hôm nay', timeLabel: '8:32', status: 'pending', tags: ['Thu nhập', 'Ý tưởng'], aiNote: 'Phát hiện 2 hướng — thêm vào Incubator?' },
  { id: '2', text: 'Cần nghiên cứu thêm về AI Agent trên điện thoại — xem Gemini và Claude mobile API.', createdAt: 'Hôm nay', timeLabel: '7:15', status: 'processing', tags: ['AI', 'Nghiên cứu'], aiNote: 'Đang phân tích pattern...', routed: 'Nghiên cứu · T6' },
  { id: '3', text: 'Dạo này hay bị phân tâm, nên thử pomodoro 25 phút thay vì 40 phút.', createdAt: 'Hôm qua', timeLabel: '22:10', status: 'reviewed', tags: ['Tập trung', 'Thói quen'], aiNote: 'Đã tạo thói quen Pomodoro mới', routed: 'Habits' },
  { id: '4', text: 'Đọc bài về SEO affiliate — lưu lại để xem sau khi chọn xong sản phẩm.', createdAt: 'Hôm qua', timeLabel: '18:45', status: 'reviewed', tags: ['Affiliate', 'Tài liệu'], routed: 'Incubator' },
  { id: '5', text: 'Muốn xây 1 content calendar tự động cho affiliate — có thể dùng Make.com + Claude API.', createdAt: '25/08', timeLabel: '11:20', status: 'pending', tags: ['Dự án', 'Automation'], aiNote: 'Dự án lớn — ước tính 3 tuần' },
  { id: '6', text: 'Nhà cần sửa máy lạnh phòng ngủ — nhớ gọi thợ tuần tới.', createdAt: '24/08', timeLabel: '9:00', status: 'reviewed', tags: ['Gia đình'], routed: 'Task · Thứ 2' },
]

const STATUS_CONFIG: Record<CaptureStatus, { label: string; bg: string; color: string; dot: string; icon: string }> = {
  pending:    { label: 'Chờ xử lý', bg: 'rgba(245,158,11,0.12)', color: '#d97706', dot: '#f59e0b', icon: '○' },
  processing: { label: 'Đang phân tích', bg: 'var(--primary-bg)', color: 'var(--primary)', dot: 'var(--primary)', icon: '◌' },
  reviewed:   { label: 'Đã xem', bg: 'var(--green-bg)', color: 'var(--green)', dot: '#22c55e', icon: '✓' },
}

const GROUPS = [
  { label: 'Hôm nay', date: 'Hôm nay' },
  { label: 'Hôm qua', date: 'Hôm qua' },
  { label: 'Tuần này', date: 'week' },
]

type FilterId = CaptureStatus | 'all'

export function InboxScreen() {
  const [filter, setFilter] = useState<FilterId>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [promoted, setPromoted] = useState<Set<string>>(new Set())

  const filtered = CAPTURES.filter(c => filter === 'all' || c.status === filter)
  const pendingCount = CAPTURES.filter(c => c.status === 'pending').length

  const todayItems = filtered.filter(c => c.createdAt === 'Hôm nay')
  const yestItems = filtered.filter(c => c.createdAt === 'Hôm qua')
  const olderItems = filtered.filter(c => c.createdAt !== 'Hôm nay' && c.createdAt !== 'Hôm qua')

  const groups = [
    { label: 'Hôm nay', items: todayItems },
    { label: 'Hôm qua', items: yestItems },
    { label: 'Tuần này', items: olderItems },
  ].filter(g => g.items.length > 0)

  return (
    <div className="pb-6 md:max-w-2xl">

      {/* Hero header */}
      <div
        className="relative px-5 pt-8 pb-5 md:px-8 overflow-hidden"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 90% -10%, var(--primary-bg) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>INBOX</p>
            <h1 className="text-[28px] font-bold leading-none" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>
              Captures
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Mọi ý tưởng đều được lưu lại để xử lý.</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span className="text-xl font-bold leading-none" style={{ color: '#d97706' }}>{pendingCount}</span>
              <span className="text-[9px] font-bold mt-0.5" style={{ color: '#d97706' }}>CHỜ</span>
            </div>
          )}
        </div>

        {/* Status pill bar */}
        <div className="relative z-10 flex gap-1.5 mt-4 overflow-x-auto hide-scrollbar pb-0.5">
          {([
            { id: 'all' as const, label: 'Tất cả', count: CAPTURES.length },
            { id: 'pending' as const, label: 'Chờ', count: CAPTURES.filter(c => c.status === 'pending').length },
            { id: 'processing' as const, label: 'Đang phân tích', count: CAPTURES.filter(c => c.status === 'processing').length },
            { id: 'reviewed' as const, label: 'Đã xem', count: CAPTURES.filter(c => c.status === 'reviewed').length },
          ] as const).map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold flex-shrink-0"
              style={{
                background: filter === id ? 'var(--primary)' : 'var(--bg-2)',
                color: filter === id ? 'white' : 'var(--text-2)',
                border: `1px solid ${filter === id ? 'transparent' : 'var(--border)'}`,
              }}
            >
              {label}
              <span className="text-[10px] opacity-80 font-bold">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline groups */}
      <div className="px-4 pt-4 md:px-8 space-y-6">
        {groups.map(group => (
          <div key={group.label}>
            {/* Group label */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>{group.label.toUpperCase()}</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />

              <div className="space-y-3">
                {group.items.map((c, i) => {
                  const cfg = STATUS_CONFIG[c.status]
                  const isOpen = expanded === c.id
                  const isPromoted = promoted.has(c.id)

                  return (
                    <div key={c.id} className="flex gap-3">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0 flex flex-col items-center" style={{ width: 40 }}>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-2.5"
                          style={{
                            background: c.status === 'reviewed' ? '#dcfce7' : c.status === 'processing' ? 'var(--primary-bg)' : 'rgba(245,158,11,0.15)',
                            color: cfg.dot,
                            border: `1.5px solid ${cfg.dot}`,
                          }}
                        >
                          {cfg.icon}
                        </div>
                        <span className="text-[9px] mt-1 font-medium" style={{ color: 'var(--text-3)' }}>{c.timeLabel}</span>
                      </div>

                      {/* Card */}
                      <div
                        className="flex-1 rounded-2xl overflow-hidden"
                        style={{
                          background: isOpen ? 'var(--card)' : 'var(--surface)',
                          border: `1px solid ${isOpen ? 'var(--primary-border)' : 'var(--border)'}`,
                          boxShadow: isOpen ? 'var(--shadow-raise)' : 'none',
                          opacity: isPromoted ? 0.5 : 1,
                        }}
                      >
                        <button
                          className="flex items-start gap-3 w-full p-4 text-left"
                          onClick={() => setExpanded(isOpen ? null : c.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm leading-relaxed"
                              style={{
                                color: 'var(--text)',
                                display: '-webkit-box',
                                WebkitLineClamp: isOpen ? undefined : 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: isOpen ? 'visible' : 'hidden',
                              } as React.CSSProperties}
                            >
                              {c.text}
                            </p>
                            {/* Meta row */}
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                              {c.routed && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  {c.routed}
                                </span>
                              )}
                            </div>
                            {/* AI note */}
                            {c.aiNote && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <div className="w-3 h-3 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-bg)' }}>
                                  <svg width="6" height="6" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="var(--primary)"/></svg>
                                </div>
                                <p className="text-[11px]" style={{ color: 'var(--primary)' }}>{c.aiNote}</p>
                              </div>
                            )}
                          </div>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            style={{ transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s', color: 'var(--text-3)', flexShrink: 0, marginTop: 3 }}
                          >
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>

                        {/* Expanded panel */}
                        {isOpen && (
                          <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
                            {/* Tags */}
                            {c.tags && (
                              <div className="flex flex-wrap gap-1.5 pt-3 mb-3">
                                {c.tags.map(tag => (
                                  <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setPromoted(p => { const n = new Set(p); n.add(c.id); return n }); setExpanded(null) }}
                                className="flex-1 h-9 rounded-xl text-xs font-semibold"
                                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                              >
                                → Action
                              </button>
                              <button
                                onClick={() => { setPromoted(p => { const n = new Set(p); n.add(c.id); return n }); setExpanded(null) }}
                                className="flex-1 h-9 rounded-xl text-xs font-semibold"
                                style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}
                              >
                                💡 Incubator
                              </button>
                              <button
                                onClick={() => { setPromoted(p => { const n = new Set(p); n.add(c.id); return n }); setExpanded(null) }}
                                className="h-9 px-3 rounded-xl text-xs font-semibold"
                                style={{ background: 'var(--red-bg)', color: 'var(--red)' }}
                              >
                                Xoá
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl p-10 flex flex-col items-center gap-3 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-3xl">📭</span>
            <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Không có Capture nào.</p>
          </div>
        )}
      </div>

      {/* Bottom tip */}
      <div className="mx-4 mt-5 md:mx-8 px-4 py-3 rounded-2xl" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--primary)' }}>
          ✨ LifeOS tự động gộp và phân loại captures mỗi đêm. Bạn chỉ cần review vào buổi sáng.
        </p>
      </div>
    </div>
  )
}
