import { useState } from 'react'

type FlowStep = 'current' | 'analysis' | 'questions' | 'preview' | 'confirmed'

interface FocusArea {
  emoji: string
  label: string
  color: string
}

const CURRENT_DIRECTION = {
  season: 'Season 3 · Tháng 9 – 11/2026',
  title: 'Xây nền tảng thu nhập tự động',
  description: 'Tập trung vào việc tạo ra ít nhất 1 nguồn thu nhập không phụ thuộc thời gian — để có sự linh hoạt theo đuổi dự án dài hạn.',
  focusAreas: [
    { emoji: '🔗', label: 'Affiliate Automation', color: '#f59e0b' },
    { emoji: '🧱', label: 'AOP Framework', color: '#3b82f6' },
    { emoji: '🤖', label: 'AI Agent MVP', color: '#8b5cf6' },
  ] as FocusArea[],
  weekProgress: 6,
  totalWeeks: 13,
  wins: ['Affiliate landing page draft xong', 'Đăng ký 2 affiliate program'],
  nextMilestone: 'Landing page live + traffic 500/tháng',
}

const ANALYSIS_TOPICS = [
  { emoji: '💰', label: 'Thu nhập & tài chính', color: '#f59e0b', active: true },
  { emoji: '🧠', label: 'Học tập & phát triển', color: '#3b82f6', active: true },
  { emoji: '🏃', label: 'Sức khoẻ', color: '#22c55e', active: false },
  { emoji: '🤝', label: 'Kết nối', color: '#ec4899', active: false },
  { emoji: '🎨', label: 'Sáng tạo', color: '#8b5cf6', active: true },
]

const QUESTIONS = [
  {
    q: 'Trong 3 tháng tới, điều nào đúng nhất với bạn?',
    options: [
      'Tôi muốn tập trung sâu vào 1–2 dự án chính',
      'Tôi muốn thử nghiệm nhiều thứ để tìm hướng đi',
      'Tôi cần ổn định trước khi xây mới',
    ],
  },
  {
    q: 'Bạn muốn cảm thấy thế nào sau Season này?',
    options: [
      'Tự tin hơn về thu nhập và tài chính',
      'Có sản phẩm/dự án cụ thể để show',
      'Cân bằng hơn giữa công việc và cuộc sống',
    ],
  },
  {
    q: 'Điều gì đang cản trở bạn nhiều nhất?',
    options: [
      'Thiếu thời gian và năng lượng',
      'Không biết bắt đầu từ đâu',
      'Mất tập trung, quá nhiều ý tưởng',
    ],
  },
]

function ProgressRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-2)" strokeWidth="4.5" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="4.5"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
      />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fontWeight: 700, fill: color }}>{pct}%</text>
    </svg>
  )
}

function CurrentDirection({ onUpdate }: { onUpdate: () => void }) {
  const { season, title, description, focusAreas, weekProgress, totalWeeks, wins, nextMilestone } = CURRENT_DIRECTION
  const pct = Math.round((weekProgress / totalWeeks) * 100)

  return (
    <div>
      {/* Season card */}
      <div
        className="rounded-3xl overflow-hidden mb-4"
        style={{ boxShadow: 'var(--shadow-raise)' }}
      >
        {/* Gradient header */}
        <div
          className="px-5 pt-6 pb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--blue))' }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-white/70 mb-1">SEASON HIỆN TẠI</p>
                <p className="text-xs font-semibold text-white/80">{season}</p>
              </div>
              <ProgressRing pct={pct} color="white" size={52} />
            </div>
            <h2
              className="text-2xl font-bold text-white leading-snug"
              style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}
            >
              {title}
            </h2>
            <p className="text-sm text-white/75 mt-2 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Body */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 24px 24px' }}>
          {/* Focus areas */}
          <div className="px-5 pt-4">
            <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'var(--text-3)' }}>FOCUS AREAS</p>
            <div className="flex gap-2 flex-wrap">
              {focusAreas.map(fa => (
                <div key={fa.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: `${fa.color}14`, border: `1px solid ${fa.color}28` }}>
                  <span className="text-sm">{fa.emoji}</span>
                  <span className="text-xs font-semibold" style={{ color: fa.color }}>{fa.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline bar */}
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>TIẾN ĐỘ SEASON</p>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Tuần {weekProgress}/{totalWeeks}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), var(--blue))' }} />
            </div>
          </div>

          {/* Next milestone */}
          <div className="px-5 pt-3 pb-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="4" y1="22" x2="4" y2="15" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="text-[9px] font-bold tracking-widest" style={{ color: 'var(--primary)' }}>MILESTONE TIẾP THEO</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{nextMilestone}</p>
              </div>
            </div>
          </div>

          {/* Wins */}
          <div className="px-5 pb-4">
            <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>THÀNH TỰU GẦN ĐÂY</p>
            <div className="space-y-1.5">
              {wins.map((w, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--green-bg)' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L20 7" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-2)' }}>{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Update button */}
          <div className="px-5 pb-5">
            <button
              onClick={onUpdate}
              className="w-full h-11 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text-2)' }}
            >
              Cập nhật Direction
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalysisStep({ onNext }: { onNext: () => void }) {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div className="space-y-3">
      <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-raise)' }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="var(--primary-fg)"/>
              </svg>
            </div>
            <p className="text-xs font-bold tracking-widest" style={{ color: 'var(--text-3)' }}>PHÂN TÍCH AI</p>
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
            Tôi thấy bạn đang quan tâm nhất đến...
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>Dựa trên Brain Dumps và hoạt động 4 tuần gần nhất</p>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_TOPICS.map(t => (
              <div key={t.label} className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: t.active ? `${t.color}14` : 'var(--bg-2)', border: `1px solid ${t.active ? t.color + '28' : 'var(--border)'}` }}>
                <span>{t.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: t.active ? t.color : 'var(--text-3)' }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mt-4 mb-3" style={{ color: 'var(--text)' }}>Tôi hiểu đúng chứ?</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirmed(true); setTimeout(onNext, 400) }}
              className="flex-1 h-10 rounded-xl font-semibold text-sm"
              style={{ background: confirmed ? 'var(--primary)' : 'var(--primary-bg)', color: confirmed ? 'var(--primary-fg)' : 'var(--primary)' }}
            >
              {confirmed ? '✓ Đúng rồi!' : 'Đúng rồi'}
            </button>
            <button
              className="flex-1 h-10 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--bg-2)', color: 'var(--text-2)' }}
            >
              Chỉnh lại
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionsStep({ onNext }: { onNext: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const allAnswered = Object.keys(answers).length === QUESTIONS.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Câu hỏi định hướng</p>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
          {Object.keys(answers).length}/{QUESTIONS.length} trả lời
        </span>
      </div>
      {QUESTIONS.map((q, qi) => (
        <div key={qi} className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-4 pt-4 pb-3">
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>{q.q}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const sel = answers[qi] === oi
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                    className="flex items-center gap-3 w-full text-left px-3.5 py-2.5 rounded-xl"
                    style={{
                      background: sel ? 'var(--primary-bg)' : 'var(--bg)',
                      border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: sel ? 'var(--primary)' : 'var(--border-2)', background: sel ? 'var(--primary)' : 'transparent' }}
                    />
                    <span className="text-sm" style={{ color: sel ? 'var(--primary)' : 'var(--text-2)' }}>{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={onNext}
        disabled={!allAnswered}
        className="w-full h-12 rounded-2xl font-bold text-sm"
        style={{
          background: allAnswered ? 'var(--primary)' : 'var(--bg-2)',
          color: allAnswered ? 'var(--primary-fg)' : 'var(--text-3)',
          boxShadow: allAnswered ? '0 6px 20px rgba(0,0,0,0.25)' : 'none',
        }}
      >
        {allAnswered ? 'Xem đề xuất Season →' : `Trả lời ${QUESTIONS.length - Object.keys(answers).length} câu hỏi nữa`}
      </button>
    </div>
  )
}

function PreviewStep({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl overflow-hidden" style={{ boxShadow: 'var(--shadow-raise)' }}>
        <div className="px-5 pt-6 pb-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--primary), var(--blue))' }}>
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <p className="text-[10px] font-bold tracking-widest text-white/70 mb-1">ĐỀ XUẤT CỦA AI</p>
            <p className="text-sm text-white/80 mb-1">Season 4 · Tháng 12/2026 – 2/2027</p>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>
              Đẩy mạnh & mở rộng
            </h2>
            <p className="text-sm text-white/75 mt-2">
              Dựa trên momentum hiện tại, đây là thời điểm tốt để scale affiliate và xuất bản AOP.
            </p>
          </div>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 24px 24px' }}>
          <div className="px-5 pt-4 pb-3">
            <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'var(--text-3)' }}>FOCUS AREAS ĐỀ XUẤT</p>
            {[
              { emoji: '🔗', label: 'Scale Affiliate to $1k/month', color: '#f59e0b' },
              { emoji: '📖', label: 'Publish AOP Framework', color: '#3b82f6' },
              { emoji: '🏋️', label: 'Phục hồi sức khoẻ routine', color: '#22c55e' },
            ].map(fa => (
              <div key={fa.label} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${fa.color}14` }}>
                  {fa.emoji}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{fa.label}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4">
            <button
              onClick={onConfirm}
              className="w-full h-12 rounded-2xl font-bold text-sm"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}
            >
              Bắt đầu Season mới 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmedStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center px-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-4xl" style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 10px 30px rgba(245,158,11,0.3)' }}>
        🚀
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900' }}>
        Season mới bắt đầu!
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
        LifeOS đã lưu hướng đi của bạn. Mỗi task từ giờ sẽ được gắn với mục tiêu này.
      </p>
      <button
        onClick={onDone}
        className="h-12 px-8 rounded-2xl font-bold text-sm"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}
      >
        Xem Direction →
      </button>
    </div>
  )
}

const STEP_ORDER: FlowStep[] = ['analysis', 'questions', 'preview', 'confirmed']

export function DirectionScreen() {
  const [step, setStep] = useState<FlowStep>('current')

  const nextStep = (current: FlowStep) => {
    const idx = STEP_ORDER.indexOf(current)
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1])
  }

  return (
    <div className="pb-6 md:max-w-2xl">
      {/* Header area */}
      <div
        className="px-5 pt-8 pb-5 md:px-8 md:pt-10"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
      >
        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>DIRECTION</p>
        <h1 className="text-[36px] leading-none font-bold" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>
          {step === 'current' ? 'Hướng đi của bạn.' : 'Định hướng mới.'}
        </h1>
        {step !== 'current' && step !== 'confirmed' && (
          <div className="flex items-center gap-2 mt-3">
            {STEP_ORDER.slice(0, 3).map((s, i) => (
              <div
                key={s}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background: STEP_ORDER.indexOf(step) >= i
                    ? 'var(--primary)'
                    : 'var(--border)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 md:px-8">
        {step === 'current' && <CurrentDirection onUpdate={() => setStep('analysis')} />}
        {step === 'analysis' && <AnalysisStep onNext={() => nextStep('analysis')} />}
        {step === 'questions' && <QuestionsStep onNext={() => nextStep('questions')} />}
        {step === 'preview' && <PreviewStep onConfirm={() => nextStep('preview')} />}
        {step === 'confirmed' && <ConfirmedStep onDone={() => setStep('current')} />}
      </div>
    </div>
  )
}
