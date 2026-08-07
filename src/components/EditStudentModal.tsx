'use client'

import { useState } from 'react'
import { updateStudentAction } from '@/actions/admin'
import { useToast } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

const BATCH_OPTIONS = [
  { value: 'BEGINNER',     label: 'Foundational (Beginner)' },
  { value: 'INTERMEDIATE', label: 'Competitive Edge (Intermediate)' },
  { value: 'ADVANCED',     label: 'Elite Pre-Pro (Advanced)' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE',    label: 'Active',    color: '#10b981' },
  { value: 'INACTIVE',  label: 'Inactive',  color: '#94a3b8' },
  { value: 'SUSPENDED', label: 'Suspended', color: '#ef4444' },
  { value: 'GRADUATED', label: 'Graduated', color: '#3b82f6' },
]

type Student = {
  id: string; studentId: string; fullName: string; age: number;
  batchType: string; coachName: string | null; contactDetails: string | null;
  enrollmentStatus: string;
}

export default function EditStudentModal({ student }: { student: Student }) {
  const [open, setOpen] = useState(false)
  const { showToast } = useToast()

  // Controlled form state - Initialized only when modal opens or on first mount
  const [fullName,         setFullName]         = useState(student.fullName)
  const [age,              setAge]              = useState(String(student.age))
  const [batchType,        setBatchType]        = useState(student.batchType || 'BEGINNER')
  const [enrollmentStatus, setEnrollmentStatus] = useState(student.enrollmentStatus || 'ACTIVE')
  const [coachName,        setCoachName]        = useState(student.coachName || '')
  const [contactDetails,   setContactDetails]   = useState(student.contactDetails || '')

  const handleOpen = () => {
    // Reset local state to the latest prop values when opening the modal
    setFullName(student.fullName)
    setAge(String(student.age))
    setBatchType(student.batchType || 'BEGINNER')
    setEnrollmentStatus(student.enrollmentStatus || 'ACTIVE')
    setCoachName(student.coachName || '')
    setContactDetails(student.contactDetails || '')
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData()
    fd.set('id', student.id)
    fd.set('fullName', fullName)
    fd.set('age', age)
    fd.set('batchType', batchType)
    fd.set('enrollmentStatus', enrollmentStatus)
    fd.set('coachName', coachName)
    fd.set('contactDetails', contactDetails)

    const result = await updateStudentAction(null, fd)
    if (result?.success) {
      showToast(result.success, 'SUCCESS')
      setOpen(false)
    } else {
      showToast(result?.error || 'Synchronization failed', 'ERROR')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    background: 'hsl(var(--bg-primary))',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '0.95rem',
    transition: 'all 0.2s'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.7rem',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em'
  }

  const statusColor = STATUS_OPTIONS.find(s => s.value === enrollmentStatus)?.color ?? '#10b981'

  return (
    <>
      <button
        onClick={handleOpen}
        className="btn btn-secondary"
        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', width: '100%', fontWeight: 800 }}
      >
        ✏ Manage Profile
      </button>

      {open && (
        <div
          onClick={e => e.target === e.currentTarget && setOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '1.5rem' 
          }}
        >
          <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '560px', padding: '2.5rem', border: '1px solid var(--border-medium)', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 900 }}>Update Profile</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <code style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-blue))', background: 'hsl(var(--accent-blue-glow))', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{student.studentId}</code>
                   <span style={{ color: statusColor, fontSize: '0.75rem', fontWeight: 800 }}>● {enrollmentStatus}</span>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}
              >✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Age</label>
                  <input required type="number" value={age} onChange={e => setAge(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Curriculum Tier</label>
                  <select required value={batchType} onChange={e => setBatchType(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                    {BATCH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Enrollment Status</label>
                  <select required value={enrollmentStatus} onChange={e => setEnrollmentStatus(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Assigned Coach</label>
                <input value={coachName} onChange={e => setCoachName(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Emergency Nexus</label>
                <input value={contactDetails} onChange={e => setContactDetails(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                <LoadingButton loadingText="Synchronizing..." style={{ flex: 1, padding: '1.1rem' }}>
                   Synchronize Changes
                </LoadingButton>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setOpen(false)} 
                  style={{ flex: 'none', padding: '0.8rem 2rem' }}
                >
                  Discard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
