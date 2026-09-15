import { useState } from 'react'

/* Reclaim-style: scheduling intelligence data */
const CAPACITY_DATA = {
  totalHours: 45,
  focusHours: 23.5,
  meetingHours: 8.0,
  bufferHours: 5.5,
  adminHours: 8.0,
  focusPct: 52,
  scheduledPct: 78,
}

/* Lifestack: Life area scores */
const LIFE_SCORES = [
  { area: 'Công việc',   score: 82, emoji: '💼', color: 'var(--primary)', trend: +5 },
  { area: 'Học tập',     score: 74, emoji: '📚', color: '#3b82f6', trend: +12 },
  { area: 'Sức khoẻ',   score: 61, emoji: '🏃', color: '#22c55e', trend: -3 },
  { area: 'Kết nối xã hội', score: 45, emoji: '🤝', color: '#f59e0b', trend: -8 },
  { area: 'Sáng tạo',   score: 70, emoji: '🎨', color: '#ec4899', trend: +2 },
]

/* AI Insights with Reclaim-style scheduling intelligence */
const INSIGHTS = [
  {
    id: 'i1',
    type: 'schedule',
    icon: '📅',
    title: 'Bảo vệ khung giờ 9–11h sáng',
    body: 'LifeOS phát hiện bạn đạt 92% focus rate vào khung này nhưng tuần tới có 3 meetings được đặt trong giờ peak. Muốn AI tự động reschedule không?',
    action: 'Reschedule meetings',
    actionColor: 'var(--primary)',
    confidence: 94,
  },
  {
    id: 'i2',
    type: 'pattern',
    icon: '🔋',
    title: 'Buffer time thiếu hụt',
    body: 'Thứ Tư của bạn liên tục có meetings back-to-back. Reclaim data: không có buffer → task giảm 40% chất lượng buổi chiều.',
    action: 'Thêm 15ph buffer',
    actionColor: '#f59e0b',
    confidence: 88,
  },
  {
    id: 'i3',
    type: 'lifestack',
    icon: '🤝',
    title: 'Kết nối xã hội cần chú ý',
    body: '4 tuần liên tiếp điểm "Kết nối xã hội" dưới 50. Đây không phải xu hướng tốt dài hạn. Thêm 1–2 buổi gặp gỡ/tuần?',
    action: 'Lên lịch giao lưu',
    actionColor: '#f59e0b',
    confidence: 76,
  },
]

/* Chat messages */
const INITIAL_MESSAGES = [
  { role: 'ai' as const, text: 'Xin chào! Tôi đã phân tích data 30 ngày của bạn. Bạn muốn bàn về điều gì?' },
  { role: 'user' as const, text: 'Tại sao tôi cứ bị phân tâm vào buổi chiều?' },
  { role: 'ai' as const, text: 'Theo data, bạn thường bị phân tâm từ 14–16h. Có 2 nguyên nhân chính: (1) không có buffer sau lunch, và (2) task buổi chiều thường không đủ cụ thể. Bạn muốn thử time blocking không?' },
]

type FeedbackState = Record<string, 'accurate' | 'partial' | 'wrong' | null>

function CapacityBar({ label, hours, total, color }: { label: string; hours: number; total: number; color: string }) {
  const pct = (hours / total) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-20 flex-shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color }}>{hours}h</span>
    </div>
  )
}

function InsightCard({ insight, feedback, onFeedback }: {
  insight: typeof INSIGHTS[0]
  feedback: 'accurate' | 'partial' | 'wrong' | null
  onFeedback: (v: 'accurate' | 'partial' | 'wrong') => void
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${insight.actionColor}18` }}
          >
            {insight.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{insight.title}</p>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
              >
                {insight.confidence}%
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{insight.body}</p>
          </div>
        </div>

        {/* Action + feedback */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            className="flex-1 h-8 rounded-lg text-xs font-bold"
            style={{ background: `${insight.actionColor}18`, color: insight.actionColor }}
          >
            {insight.action}
          </button>
          <div className="flex gap-1">
            {([
              { v: 'accurate' as const, label: '✓', title: 'Chính xác' },
              { v: 'partial' as const, label: '~', title: 'Một phần' },
              { v: 'wrong' as const, label: '✕', title: 'Sai' },
            ]).map(fb => (
              <button
                key={fb.v}
                onClick={() => onFeedback(fb.v)}
                className="w-7 h-7 rounded-lg text-xs font-bold"
                style={{
                  background: feedback === fb.v ? (fb.v === 'accurate' ? 'var(--green-bg)' : fb.v === 'partial' ? 'var(--amber-bg)' : 'var(--red-bg)') : 'var(--bg-2)',
                  color: feedback === fb.v ? (fb.v === 'accurate' ? 'var(--green)' : fb.v === 'partial' ? 'var(--amber)' : 'var(--red)') : 'var(--text-3)',
                }}
                title={fb.title}
              >
                {fb.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type CoachTab = 'insights' | 'capacity' | 'lifestack' | 'chat'

export function AICoachScreen() {
  const [tab, setTab] = useState<CoachTab>('insights')
  const [feedback, setFeedback] = useState<FeedbackState>({})
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: input }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Đây là phân tích dựa trên pattern 30 ngày của bạn. LifeOS sẽ tiếp tục học từ phản hồi của bạn để cải thiện đề xuất.',
      }])
    }, 900)
  }

  return (
    <div className="px-4 pt-5 pb-6 md:px-8 md:pt-8 md:max-w-3xl flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>AI COACH</p>
        <h1 className="text-[32px] leading-none font-bold mb-1" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>
          Huấn luyện viên AI
        </h1>
        {/* Trust score (Reclaim-style model trust) */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Độ tin cậy model:</span>
          <div className="flex-1 max-w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
            <div className="h-full rounded-full" style={{ width: '87%', background: 'linear-gradient(90deg, var(--primary), var(--green))' }} />
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>87%</span>
        </div>
      </div>

      {/* Segment tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-2)', width: 'fit-content' }}>
        {([
          { id: 'insights' as CoachTab,  label: 'Insights' },
          { id: 'capacity' as CoachTab,  label: 'Capacity' },
          { id: 'lifestack' as CoachTab, label: 'Life Score' },
          { id: 'chat' as CoachTab,      label: 'Chat' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
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

      {/* Insights tab */}
      {tab === 'insights' && (
        <div className="space-y-3">
          {INSIGHTS.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              feedback={feedback[insight.id] ?? null}
              onFeedback={v => setFeedback(prev => ({ ...prev, [insight.id]: v }))}
            />
          ))}
        </div>
      )}

      {/* Capacity tab (Reclaim-inspired) */}
      {tab === 'capacity' && (
        <div className="space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
                {CAPACITY_DATA.focusPct}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Deep Focus Rate</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-[10px]" style={{ color: 'var(--green)' }}>↑ 8% vs. avg</span>
              </div>
            </div>
            <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <p className="text-2xl font-bold" style={{ color: '#3b82f6', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
                {CAPACITY_DATA.scheduledPct}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Lịch đã AI-scheduled</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-[10px]" style={{ color: 'var(--amber)' }}>22% chưa được tối ưu</span>
              </div>
            </div>
          </div>

          {/* Capacity breakdown */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>PHÂN BỔ 45H TUẦN NÀY</p>
            <div className="space-y-3">
              <CapacityBar label="Deep Focus" hours={CAPACITY_DATA.focusHours} total={CAPACITY_DATA.totalHours} color="var(--primary)" />
              <CapacityBar label="Admin" hours={CAPACITY_DATA.adminHours} total={CAPACITY_DATA.totalHours} color="#f59e0b" />
              <CapacityBar label="Meetings" hours={CAPACITY_DATA.meetingHours} total={CAPACITY_DATA.totalHours} color="#3b82f6" />
              <CapacityBar label="Buffer" hours={CAPACITY_DATA.bufferHours} total={CAPACITY_DATA.totalHours} color="#22c55e" />
            </div>
            <div className="mt-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--amber-bg)' }}>
              <p className="text-xs" style={{ color: 'var(--amber)' }}>
                ⚠️ Buffer time chỉ 12% — Reclaim khuyến nghị tối thiểu 20% để duy trì chất lượng.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Life Score tab (Lifestack-inspired) */}
      {tab === 'lifestack' && (
        <div className="space-y-3">
          {/* Overall score */}
          <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-raise)' }}>
            <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>ĐIỂM CUỘC SỐNG</p>
            <p className="text-5xl font-bold" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
              67
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>/ 100 · Tuần này</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>↓ 2 điểm vs. tuần trước</span>
            </div>
          </div>

          {/* Area scores */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>ĐIỂM TỪNG LĨNH VỰC</p>
            </div>
            {LIFE_SCORES.map((area, i) => (
              <div key={area.area} className="px-4 py-3" style={{ borderBottom: i < LIFE_SCORES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">{area.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{area.area}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: area.color }}>{area.score}</span>
                        <span className="text-[10px] font-semibold" style={{ color: area.trend > 0 ? 'var(--green)' : 'var(--red)' }}>
                          {area.trend > 0 ? '↑' : '↓'}{Math.abs(area.trend)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${area.score}%`, background: area.color }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--primary)' }}>
              💡 Điểm "Kết nối xã hội" đang giảm 4 tuần liên tiếp. Sự cô lập có thể ảnh hưởng đến năng suất dài hạn. LifeOS gợi ý đặt lịch 1 buổi gặp gỡ tuần tới.
            </p>
          </div>
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <div className="flex flex-col" style={{ minHeight: 400 }}>
          <div className="flex-1 space-y-3 mb-3 overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center mr-2 mt-0.5" style={{ background: 'var(--primary)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="var(--primary-fg)" />
                    </svg>
                  </div>
                )}
                <div
                  className="px-3.5 py-2.5 rounded-2xl max-w-[80%] text-sm leading-relaxed"
                  style={{
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--card)',
                    color: msg.role === 'user' ? 'var(--primary-fg)' : 'var(--text)',
                    border: msg.role === 'ai' ? '1px solid var(--border)' : 'none',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Hỏi AI Coach..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text)' }}
            />
            <button
              onClick={sendMessage}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: input.trim() ? 'var(--primary)' : 'var(--bg-2)', color: input.trim() ? 'var(--primary-fg)' : 'var(--text-3)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
