import { useState } from 'react'

/* ── Source integrations (Sunsama-style) ── */
type Source = 'notion' | 'github' | 'linear' | 'gmail' | 'lifeos'

const SOURCE_CFG: Record<Source, { label: string; color: string; bg: string; icon: string }> = {
  notion:  { label: 'Notion',  color: '#374151', bg: 'rgba(55,65,81,0.08)',   icon: 'N' },
  github:  { label: 'GitHub',  color: '#1f2937', bg: 'rgba(31,41,55,0.08)',   icon: '⌥' },
  linear:  { label: 'Linear',  color: '#5b5bd6', bg: 'rgba(91,91,214,0.10)',  icon: '◈' },
  gmail:   { label: 'Gmail',   color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  icon: 'M' },
  lifeos:  { label: 'LifeOS',  color: 'var(--primary)', bg: 'var(--primary-bg)', icon: '◉' },
}

/* ── Priority (Motion-style) ── */
type Priority = 'urgent' | 'high' | 'medium' | 'low'
const PRIORITY_CFG: Record<Priority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Gấp',   color: '#dc2626', dot: '#ef4444' },
  high:   { label: 'Cao',   color: 'var(--amber)', dot: '#f59e0b' },
  medium: { label: 'Vừa',   color: 'var(--primary)', dot: 'var(--primary)' },
  low:    { label: 'Thấp',  color: 'var(--text-3)', dot: '#a8a6a8' },
}

interface Task {
  id: string
  title: string
  est: string
  source: Source
  priority: Priority
  done: boolean
  scheduled?: string
  isAI?: boolean
}

interface Project {
  id: string
  name: string
  emoji: string
  color: string
  progress: number
  milestone: string
  deadline: string
  status: 'active' | 'support' | 'incubate' | 'done'
  tasks: Task[]
}

const PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Affiliate Automation',
    emoji: '🔗',
    color: '#f59e0b',
    progress: 68,
    milestone: 'Landing page live',
    deadline: '5/9',
    status: 'active',
    tasks: [
      { id: 't1', title: 'Hoàn thiện landing page copy', est: '40ph', source: 'notion', priority: 'urgent', done: false, scheduled: '9:00', isAI: true },
      { id: 't2', title: 'Set up tracking pixel & analytics', est: '20ph', source: 'github', priority: 'high', done: false, scheduled: '9:40' },
      { id: 't3', title: 'Review affiliate product selection', est: '30ph', source: 'notion', priority: 'medium', done: true },
      { id: 't4', title: 'Draft email sequence v1', est: '45ph', source: 'gmail', priority: 'medium', done: false },
    ],
  },
  {
    id: 'p2',
    name: 'AOP Framework',
    emoji: '🧱',
    color: '#3b82f6',
    progress: 41,
    milestone: 'Module 3 draft',
    deadline: '15/9',
    status: 'active',
    tasks: [
      { id: 't5', title: 'Viết chương 3 — Execution layer', est: '60ph', source: 'notion', priority: 'high', done: false },
      { id: 't6', title: 'Review feedback từ beta readers', est: '25ph', source: 'gmail', priority: 'medium', done: false },
      { id: 't7', title: 'Tạo diagram cho framework', est: '30ph', source: 'linear', priority: 'low', done: true },
    ],
  },
  {
    id: 'p3',
    name: 'AI Agent Mobile',
    emoji: '🤖',
    color: '#8b5cf6',
    progress: 28,
    milestone: 'MVP chat flow',
    deadline: '30/9',
    status: 'support',
    tasks: [
      { id: 't8', title: 'Nghiên cứu Claude mobile API', est: '45ph', source: 'github', priority: 'high', done: false },
      { id: 't9', title: 'Design system cho mobile UI', est: '60ph', source: 'linear', priority: 'medium', done: false },
    ],
  },
  {
    id: 'p4',
    name: 'LifeOS Dev',
    emoji: '⚡',
    color: 'var(--primary)',
    progress: 12,
    milestone: 'Core screens done',
    deadline: '10/10',
    status: 'support',
    tasks: [
      { id: 't10', title: 'Implement Reflect screen', est: '90ph', source: 'lifeos', priority: 'medium', done: false },
      { id: 't11', title: 'Data model design', est: '120ph', source: 'lifeos', priority: 'high', done: false },
    ],
  },
]

type ViewTab = 'all' | 'active' | 'support'

function SourceBadge({ source }: { source: Source }) {
  const cfg = SOURCE_CFG[source]
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="font-mono text-[9px] leading-none">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_CFG[priority].dot }} />
  )
}

function TimeBlock({ scheduled }: { scheduled: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {scheduled}
    </span>
  )
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div
      className="flex items-start gap-3 py-2.5 px-3"
      style={{ opacity: task.done ? 0.5 : 1 }}
    >
      <button
        onClick={onToggle}
        className="w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
        style={{
          width: 18, height: 18,
          borderColor: task.done ? 'var(--primary)' : 'var(--border-2)',
          background: task.done ? 'var(--primary)' : 'transparent',
        }}
      >
        {task.done && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityDot priority={task.priority} />
          <span className="text-sm font-medium" style={{ color: task.done ? 'var(--text-3)' : 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}>
            {task.title}
          </span>
          {task.isAI && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>AI</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <SourceBadge source={task.source} />
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{task.est}</span>
          {task.scheduled && <TimeBlock scheduled={task.scheduled} />}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ project, onToggleTask }: { project: Project; onToggleTask: (pid: string, tid: string) => void }) {
  const [open, setOpen] = useState(project.status === 'active')
  const doneTasks = project.tasks.filter(t => t.done).length

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Project header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        {/* Emoji avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${project.color}18`, border: `1px solid ${project.color}30` }}
        >
          {project.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{project.name}</p>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${project.color}18`, color: project.color }}>
              {doneTasks}/{project.tasks.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
              <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: project.color }} />
            </div>
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: project.color }}>{project.progress}%</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>📌 {project.milestone}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>· hạn {project.deadline}</span>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s', color: 'var(--text-3)' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Task list */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {project.tasks.map((task, i) => (
            <div key={task.id} style={{ borderBottom: i < project.tasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <TaskRow task={task} onToggle={() => onToggleTask(project.id, task.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Today's Focus (Sunsama daily planning ritual) ── */
function TodayFocus({ projects }: { projects: Project[] }) {
  const allTasks = projects.flatMap(p => p.tasks.map(t => ({ ...t, projectName: p.name, projectColor: p.color, projectEmoji: p.emoji }))).filter(t => t.scheduled)
  const totalEst = allTasks.reduce((sum, t) => {
    const m = parseInt(t.est)
    return sum + (isNaN(m) ? 0 : m)
  }, 0)

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-raise)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 6.4H21l-5.6 4.1 2.1 6.5L12 15.3l-5.5 3.7 2.1-6.5L3 8.4h6.6z" fill="var(--primary-fg)" />
            </svg>
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>KẾ HOẠCH HÔM NAY</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
            AI scheduled
          </span>
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>{Math.floor(totalEst / 60)}h {totalEst % 60}ph</span>
      </div>
      {/* Scheduled tasks timeline */}
      {allTasks.map((task, i) => (
        <div key={task.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: i < allTasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <span className="text-[11px] font-bold tabular-nums w-10 flex-shrink-0" style={{ color: 'var(--primary)' }}>{task.scheduled}</span>
          <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ background: `${task.projectColor}40` }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px]" style={{ color: task.projectColor }}>{task.projectEmoji} {task.projectName}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{task.est}</span>
            </div>
          </div>
          <SourceBadge source={task.source} />
        </div>
      ))}
    </div>
  )
}

export function ExecuteScreen() {
  const [view, setView] = useState<ViewTab>('all')
  const [projects, setProjects] = useState(PROJECTS)

  const toggleTask = (pid: string, tid: string) => {
    setProjects(prev => prev.map(p =>
      p.id === pid
        ? { ...p, tasks: p.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t) }
        : p
    ))
  }

  const filtered = view === 'all' ? projects : projects.filter(p => p.status === view)

  return (
    <div className="pb-6 md:max-w-4xl">
      {/* Hero header */}
      <div className="hero-execute relative overflow-hidden px-5 pt-9 pb-5 md:px-8">
        {/* Doodle decorations */}
        <svg className="absolute pointer-events-none" style={{ top: 10, right: 18, opacity: 0.20 }} width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 2L18 11H27L20 17L23 26L15 20L7 26L10 17L3 11H12L15 2Z" stroke="var(--text)" strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
        <svg className="absolute pointer-events-none" style={{ bottom: 14, right: 50, opacity: 0.13 }} width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="16" height="16" rx="4" stroke="var(--text)" strokeWidth="1.5"/>
          <path d="M7 10h6M10 7v6" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-extrabold tracking-widest mb-1.5" style={{ color: 'var(--text-3)', letterSpacing: '0.14em', fontFamily: "'Nunito', sans-serif" }}>THỨ NĂM · 27/8</p>
            <h1 className="text-[48px] leading-none" style={{ color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontWeight: '900', textTransform: 'uppercase' }}>
              THỰC THI
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5 pb-1">
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>Năng lực hôm nay</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: '65%', background: 'var(--primary)' }} />
              </div>
              <span className="text-sm font-extrabold" style={{ color: 'var(--primary)' }}>65%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 md:px-8">

      {/* Today's plan (Sunsama) */}
      <TodayFocus projects={projects} />

      {/* View tabs */}
      <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: 'var(--bg-2)', width: 'fit-content' }}>
        {([
          { id: 'all' as ViewTab, label: 'Tất cả' },
          { id: 'active' as ViewTab, label: 'Active' },
          { id: 'support' as ViewTab, label: 'Support' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: view === id ? 'var(--card)' : 'transparent',
              color: view === id ? 'var(--text)' : 'var(--text-3)',
              boxShadow: view === id ? 'var(--shadow-card)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Projects */}
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {filtered.map(project => (
          <ProjectCard key={project.id} project={project} onToggleTask={toggleTask} />
        ))}
      </div>

      {/* Source legend (Sunsama-style bottom) */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Tích hợp:</span>
        {(Object.entries(SOURCE_CFG) as [Source, typeof SOURCE_CFG[Source]][]).map(([k, cfg]) => (
          <span key={k} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: cfg.bg, color: cfg.color }}>
            <span className="font-mono">{cfg.icon}</span>{cfg.label}
          </span>
        ))}
      </div>
      </div>{/* end padding wrapper */}
    </div>
  )
}
