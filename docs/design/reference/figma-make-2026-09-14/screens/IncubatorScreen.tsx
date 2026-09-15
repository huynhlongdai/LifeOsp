import { useState } from 'react'

type IncubatorCategory = 'incubate' | 'notnow' | 'someday'

interface Idea {
  id: string
  title: string
  desc?: string
  category: IncubatorCategory
  addedAt: string
  origin?: string
}

const IDEAS: Idea[] = [
  { id: '1', title: 'LifeOS architecture', desc: 'Thiết kế lại toàn bộ kiến trúc data layer của LifeOS — có thể dùng event sourcing.', category: 'incubate', addedAt: '23/08', origin: 'Brain Dump' },
  { id: '2', title: 'ThingsO', desc: 'Ứng dụng quản lý đồ vật trong nhà + tái sử dụng. Chưa có thời gian nghiên cứu.', category: 'incubate', addedAt: '20/08', origin: 'Brain Dump' },
  { id: '3', title: 'Garden AI', desc: 'AI giúp lên kế hoạch trồng rau sân thượng theo mùa. Ý tưởng vui nhưng không ưu tiên.', category: 'incubate', addedAt: '18/08', origin: 'Brain Dump' },
  { id: '4', title: 'Viết blog tech hàng tuần', desc: 'Muốn chia sẻ những thứ đang học nhưng chưa có thời gian nhất quán.', category: 'notnow', addedAt: '15/08', origin: 'Brain Dump' },
  { id: '5', title: 'Học tiếng Nhật', desc: 'Muốn đọc được manga gốc. Nhưng hiện tại không phải ưu tiên.', category: 'notnow', addedAt: '10/08', origin: 'Tự thêm' },
  { id: '6', title: 'Làm game mobile nhỏ', desc: 'Một game casual đơn giản để học Flutter. Có thể thử someday khi có thời gian rảnh.', category: 'someday', addedAt: '5/08', origin: 'Brain Dump' },
]

const CATEGORY_CONFIG: Record<IncubatorCategory, { label: string; desc: string; bg: string; color: string; dot: string }> = {
  incubate: { label: 'Incubate', desc: 'Đang ấp ủ, có tiềm năng', bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', dot: '#f59e0b' },
  notnow:   { label: 'Not Now', desc: 'Chưa phải lúc', bg: 'rgba(122,138,170,0.08)', color: 'var(--text-2)', dot: 'var(--text-3)' },
  someday:  { label: 'Someday', desc: 'Có thể làm khi có thời gian', bg: 'rgba(56,189,248,0.1)', color: '#7dd3fc', dot: '#38bdf8' },
}

export function IncubatorScreen() {
  const [filter, setFilter] = useState<IncubatorCategory | 'all'>('all')
  const filtered = IDEAS.filter((i) => filter === 'all' || i.category === filter)

  return (
    <div className="px-4 pt-5 pb-6 md:px-8 md:pt-8 md:max-w-3xl">
      {/* Header */}
      <div className="mb-2">
        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>INCUBATOR</p>
        <h1 className="text-[30px] font-bold leading-none" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', letterSpacing: '0.01em' }}>Ý tưởng đang ấp ủ</h1>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
        Những thứ bạn không muốn quên nhưng chưa đến lúc hành động. Không phải thất bại — chỉ là chưa phải bây giờ.
      </p>

      {/* Category summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(Object.entries(CATEGORY_CONFIG) as [IncubatorCategory, typeof CATEGORY_CONFIG[IncubatorCategory]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className="rounded-xl p-3 text-left transition-all"
            style={{
              background: filter === key ? cfg.bg : 'var(--bg-2)',
              border: `1px solid ${filter === key ? cfg.dot + '44' : 'var(--border)'}`,
            }}
          >
            <p className="text-lg font-bold" style={{ color: cfg.color }}>{IDEAS.filter(i => i.category === key).length}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: filter === key ? cfg.color : 'var(--text-2)' }}>{cfg.label}</p>
            <p className="text-[10px] mt-0.5 hidden md:block" style={{ color: 'var(--text-3)' }}>{cfg.desc}</p>
          </button>
        ))}
      </div>

      {/* Ideas list */}
      <div className="space-y-2.5">
        {filtered.map((idea) => {
          const cfg = CATEGORY_CONFIG[idea.category]
          return (
            <div
              key={idea.id}
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(160deg, var(--card), var(--bg-2))', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: cfg.dot }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{idea.title}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    {idea.desc && <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-2)' }}>{idea.desc}</p>}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Thêm {idea.addedAt}</span>
                      {idea.origin && <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>via {idea.origin}</span>}
                    </div>
                  </div>
                </div>
                {/* Promote button */}
                <button
                  className="flex-shrink-0 h-8 px-3 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--primary-bg)', color: 'var(--primary-2)', border: '1px solid var(--primary-border)' }}
                >
                  Kích hoạt
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="rounded-2xl p-10 flex flex-col items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-3xl">💡</span>
          <p className="text-sm font-medium text-center" style={{ color: 'var(--text-2)' }}>
            Không có ý tưởng nào trong danh mục này.
          </p>
        </div>
      )}

      {/* Info footer */}
      <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
        <p className="text-xs leading-relaxed" style={{ color: '#6a7a94' }}>
          💡 LifeOS sẽ nhắc lại những ý tưởng này khi Season mới bắt đầu hoặc khi bạn có dư năng lượng.
        </p>
      </div>
    </div>
  )
}
