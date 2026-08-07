import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import BatchChat from '@/components/BatchChat'

function getInitials(name: string) {
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  const colors = ['#3b82f6','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#06b6d4']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const batchConfig: Record<string, { label: string; color: string }> = {
  BEGINNER:     { label: 'Foundation', color: '#3b82f6' },
  INTERMEDIATE: { label: 'Competitive', color: '#f59e0b' },
  ADVANCED:     { label: 'Elite', color: '#ef4444' },
}

export default async function PlayerDirectory() {
  const payload = await getSession()
  if (!payload) return <div style={{ padding: '2rem', fontSize: '0.85rem' }}>Please log in.</div>

  const currentStudent = await prisma.student.findUnique({ where: { userId: payload.id } })
  if (!currentStudent) return <div style={{ padding: '2rem', fontSize: '0.85rem' }}>Student record missing.</div>

  const students = await prisma.student.findMany({
    where: { enrollmentStatus: 'ACTIVE' }, orderBy: { fullName: 'asc' }
  })

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.2rem' }}>Athlete Circle</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Player directory and batch chat.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '0.75rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left: Player Cards */}
        <div style={{ overflowY: 'auto', paddingRight: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
            {students.map((s: any) => {
              const bt = batchConfig[s.batchType] || { label: s.batchType, color: '#60a5fa' }
              const isMe = s.userId === payload.id
              return (
                <div key={s.id} style={{
                  padding: '0.65rem', textAlign: 'center', borderRadius: '8px',
                  border: isMe ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                  background: isMe ? 'rgba(59,130,246,0.04)' : 'hsl(var(--bg-card))'
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${getAvatarColor(s.fullName)}cc, ${getAvatarColor(s.fullName)}60)`,
                    display: 'grid', placeItems: 'center', fontSize: '0.7rem', fontWeight: 700,
                    color: '#fff', margin: '0 auto 0.4rem'
                  }}>{getInitials(s.fullName)}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.15rem', color: '#f1f5f9' }}>{s.fullName}</div>
                  <span style={{ padding: '0.1rem 0.3rem', borderRadius: '3px', background: `${bt.color}10`, color: bt.color, fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase' }}>{bt.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Chat */}
        <BatchChat batchType={currentStudent.batchType} currentStudentId={currentStudent.id} />
      </div>
    </div>
  )
}
