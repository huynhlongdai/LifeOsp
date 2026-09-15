import { useState, useRef, useEffect } from 'react'

type InputMode = 'write' | 'speak' | 'file'

const TAG_SUGGESTIONS = [
  '💡 Ý tưởng', '📁 Dự án', '🎯 Mục tiêu', '😰 Nỗi lo',
  '💼 Công việc', '❓ Thắc mắc', '📚 Tài liệu', '🌿 Kế hoạch',
]

export function BrainDumpModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<InputMode>('write')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [listening, setListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (mode === 'write') textareaRef.current?.focus()
  }, [mode])

  const handleSend = () => {
    if (!text.trim()) return
    setSent(true)
    setTimeout(onClose, 1600)
  }

  const appendTag = (tag: string) => {
    const clean = tag.replace(/^[\p{Emoji}\s]+/u, '').trim()
    setText(t => t ? `${t}\n${clean}: ` : `${clean}: `)
    textareaRef.current?.focus()
  }

  const charPct = Math.min(100, (text.length / 2000) * 100)
  const charColor = text.length > 1800 ? '#dc2626' : text.length > 1400 ? '#d97706' : 'var(--text-3)'

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full flex flex-col braindump-sheet"
        style={{
          background: 'var(--surface)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '94vh',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            .braindump-sheet {
              border-radius: 28px !important;
              max-width: 540px !important;
              width: 100% !important;
              max-height: 90vh !important;
              border-bottom: 1px solid var(--border) !important;
            }
          }
        `}</style>

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3.5 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-2)' }} />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 md:px-6">

          {/* Header */}
          <div className="flex items-center justify-between pt-4 pb-3">
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-2)', color: 'var(--text-2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="var(--primary-fg)"/>
                </svg>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Brain Dump</span>
            </div>
            {/* Char arc indicator */}
            <div className="relative w-8 h-8">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="var(--border)" strokeWidth="2.5"/>
                <circle
                  cx="16" cy="16" r="12" fill="none"
                  stroke={charColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(charPct / 100) * 75.4} 75.4`}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '16px 16px', transition: 'stroke-dasharray 0.3s' }}
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="mb-5">
            <h2 className="text-[24px] font-bold leading-snug mb-1" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>
              Ném hết ra ngoài.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Đừng sắp xếp. Đừng lọc. Cứ viết thật hết — LifeOS sẽ tự phân loại sau.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1.5 mb-4 p-1.5 rounded-2xl" style={{ background: 'var(--bg-2)' }}>
            {([
              { id: 'write' as InputMode, label: 'Viết', icon: '✏️' },
              { id: 'speak' as InputMode, label: 'Nói', icon: '🎙' },
              { id: 'file' as InputMode, label: 'Tệp', icon: '📎' },
            ] as const).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
                style={{
                  background: mode === id ? 'var(--card)' : 'transparent',
                  color: mode === id ? 'var(--text)' : 'var(--text-3)',
                  boxShadow: mode === id ? 'var(--shadow-card)' : 'none',
                }}
              >
                <span className="text-base">{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* Write mode */}
          {mode === 'write' && (
            <div className="relative mb-3">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"Tôi muốn kiếm thêm thu nhập online...\nTôi đang lo về dự án X...\nMua sắm cuối tuần...\nÝ tưởng app mới..."}
                className="w-full rounded-2xl p-4 text-sm resize-none outline-none leading-relaxed"
                style={{
                  background: 'var(--bg)',
                  border: `1.5px solid ${text.length > 0 ? 'var(--primary-border)' : 'var(--border)'}`,
                  color: 'var(--text)',
                  minHeight: 180,
                  transition: 'border-color 0.2s',
                }}
                rows={7}
              />
              {text.length === 0 && (
                <div className="absolute bottom-3 right-3 pointer-events-none">
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Enter để xuống dòng</span>
                </div>
              )}
            </div>
          )}

          {/* Speak mode */}
          {mode === 'speak' && (
            <div
              className="rounded-2xl flex flex-col items-center justify-center gap-4 mb-3"
              style={{ minHeight: 180, background: 'var(--bg)', border: '1.5px solid var(--border)' }}
            >
              <button
                onClick={() => setListening(l => !l)}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: listening ? 'linear-gradient(135deg, #dc2626, #9b1c1c)' : 'var(--primary)',
                  boxShadow: listening ? '0 0 0 12px rgba(220,38,38,0.15), 0 8px 24px rgba(220,38,38,0.3)' : '0 4px 24px rgba(0,0,0,0.30)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z" fill="white"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                </svg>
              </button>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {listening ? 'Đang nghe...' : 'Nhấn để nói'}
              </p>
              <p className="text-xs text-center px-6" style={{ color: 'var(--text-3)' }}>
                Nói tự nhiên như đang tâm sự. AI sẽ hiểu.
              </p>
            </div>
          )}

          {/* File mode */}
          {mode === 'file' && (
            <div
              className="rounded-2xl flex flex-col items-center justify-center gap-3 mb-3"
              style={{ minHeight: 180, background: 'var(--bg)', border: '2px dashed var(--border-2)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-bg)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M12 16V4m-4 8l4-4 4 4" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 20h16" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Kéo thả file vào đây</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>PDF, ảnh, ghi chú, web link...</p>
              <button className="text-xs font-bold px-4 py-2 rounded-xl" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                Chọn file
              </button>
            </div>
          )}

          {/* Tag suggestions */}
          <div className="mb-5">
            <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'var(--text-3)' }}>GỢI Ý TAG NHANH</p>
            <div className="flex flex-wrap gap-2">
              {TAG_SUGGESTIONS.map(tag => (
                <button
                  key={tag}
                  onClick={() => appendTag(tag)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full active:scale-95"
                  style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          {sent ? (
            <div className="h-13 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm mb-1" style={{ height: 52, background: 'var(--green)', color: 'var(--primary-fg)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Đã lưu! LifeOS đang phân tích...
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim() && mode === 'write'}
              className="w-full rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm"
              style={{
                height: 52,
                background: (text.trim() || mode !== 'write') ? 'var(--primary)' : 'var(--bg-2)',
                color: (text.trim() || mode !== 'write') ? 'var(--primary-fg)' : 'var(--text-3)',
                boxShadow: (text.trim() || mode !== 'write') ? '0 6px 20px rgba(0,0,0,0.25)' : 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="currentColor"/>
              </svg>
              Để LifeOS xử lý
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
