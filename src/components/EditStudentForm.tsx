'use client'

import { useState } from 'react'
import { updateStudentAction } from '@/actions/admin'
import { useToast } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import { useRouter } from 'next/navigation'

const BATCH_OPTIONS = [
  { value: 'BEGINNER',     label: 'Foundational (Beginner)' },
  { value: 'INTERMEDIATE', label: 'Competitive Edge (Intermediate)' },
  { value: 'ADVANCED',     label: 'Elite Pro (Advanced)' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE',    label: 'Active',    color: '#10b981' },
  { value: 'INACTIVE',  label: 'Inactive',  color: '#94a3b8' },
  { value: 'SUSPENDED', label: 'Suspended', color: '#ef4444' },
  { value: 'GRADUATED', label: 'Graduated', color: '#3b82f6' },
]

type StudentWithUser = {
  id: string
  studentId: string
  fullName: string
  age: number
  batchType: string
  coachName: string | null
  contactDetails: string | null
  enrollmentStatus: string
  user?: {
    phone: string | null
  }
}

export default function EditStudentForm({ student }: { student: StudentWithUser }) {
  const router = useRouter()
  const { showToast } = useToast()

  const [fullName,         setFullName]         = useState(student.fullName)
  const [age,              setAge]              = useState(String(student.age))
  const [batchType,        setBatchType]        = useState(student.batchType || 'BEGINNER')
  const [enrollmentStatus, setEnrollmentStatus] = useState(student.enrollmentStatus || 'ACTIVE')
  const [coachName,        setCoachName]        = useState(student.coachName || '')
  const [contactDetails,   setContactDetails]   = useState(student.contactDetails || '')
  const [phone,            setPhone]            = useState(student.user?.phone || '')
  const [newPassword,      setNewPassword]      = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (enrollmentStatus === 'SUSPENDED' && student.enrollmentStatus !== 'SUSPENDED') {
      const confirmed = window.confirm(
        `Are you sure you want to SUSPEND ${fullName}? This will restrict their academy access and tournament entry.`
      )
      if (!confirmed) return
    }

    const fd = new FormData()
    fd.set('id', student.id)
    fd.set('fullName', fullName)
    fd.set('age', age)
    fd.set('batchType', batchType)
    fd.set('enrollmentStatus', enrollmentStatus)
    fd.set('coachName', coachName)
    fd.set('contactDetails', contactDetails)
    if (phone && phone !== student.user?.phone) {
      fd.set('phone', phone)
    }
    if (newPassword.trim()) {
      fd.set('newPassword', newPassword.trim())
    }

    const result = await updateStudentAction(null, fd)
    if (result?.success) {
      showToast(result.success, 'SUCCESS')
      router.push('/admin/students')
      router.refresh()
    } else {
      showToast(result?.error || 'Update failed', 'ERROR')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '1.25rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: '16px',
    outline: 'none',
    fontSize: '1.1rem',
    transition: '0.2s',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '0.75rem',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.8rem',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Player Full Name</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Age</label>
          <input required type="number" value={age} onChange={(e) => setAge(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Curriculum Tier</label>
          <select
            required
            value={batchType}
            onChange={(e) => setBatchType(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', background: 'hsl(var(--bg-primary))' }}
          >
            {BATCH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Enrollment Status</label>
          <select
            required
            value={enrollmentStatus}
            onChange={(e) => setEnrollmentStatus(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', background: 'hsl(var(--bg-primary))' }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Mobile Phone (E.164 / Indian 10-Digit)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
            placeholder="e.g. 9876543210"
          />
        </div>
        <div>
          <label style={labelStyle}>Reset Account Password (Optional)</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
            placeholder="Leave blank to keep unchanged"
            minLength={8}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Assigned Coach</label>
        <input
          value={coachName}
          onChange={(e) => setCoachName(e.target.value)}
          style={inputStyle}
          placeholder="Not currently assigned"
        />
      </div>

      <div>
        <label style={labelStyle}>Emergency Contact Information</label>
        <input
          value={contactDetails}
          onChange={(e) => setContactDetails(e.target.value)}
          style={inputStyle}
          placeholder="Contact person or secondary number"
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          marginTop: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '2.5rem',
        }}
      >
        <LoadingButton loadingText="Updating Athlete..." style={{ flex: 1, padding: '1.25rem', fontSize: '1.1rem' }}>
          Save Athlete Profile
        </LoadingButton>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push('/admin/students')}
          style={{ flex: 'none', padding: '0.8rem 2.5rem', fontSize: '1rem' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
