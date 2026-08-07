'use client'

import { useActionState, useEffect } from 'react'
import { broadcastNotificationAction } from '@/actions/admin'
import { useToast } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

export default function BroadcastNotice() {
  const [state, formAction] = useActionState(broadcastNotificationAction, null)
  const { showToast } = useToast()

  useEffect(() => {
    if (state?.success) {
      showToast(state.success, 'SUCCESS')
    } else if (state?.error) {
      showToast(state.error, 'ERROR')
    }
  }, [state, showToast])

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-subtle)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '0.95rem',
    transition: 'all 0.2s'
  }

  return (
    <div className="card" style={{ borderTop: '4px solid hsl(var(--accent-red))' }}>
      <h3 style={{ marginBottom: '0.5rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>📢</span> Academy Broadcast Hub
      </h3>
      <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Post to the global feed and send push alerts to all athletes.
      </p>
      
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Message Title</label>
          <input required name="title" type="text" placeholder="e.g. Tournament Registration Open" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Urgency Category</label>
          <select name="category" style={{ ...inputStyle, appearance: 'none' }}>
            <option value="GENERAL">General Update</option>
            <option value="TOURNAMENT">Tournament News</option>
            <option value="URGENT">Urgent Alert</option>
            <option value="HOLIDAY">Holiday/Schedule</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'hsl(var(--text-muted))', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Full Announcement</label>
          <textarea required name="message" placeholder="Describe the update in detail..." rows={4} style={{ ...inputStyle, resize: 'vertical' }}></textarea>
        </div>

        <LoadingButton loadingText="Broadcasting..." style={{ width: '100%', padding: '1.1rem' }}>
          Publish to Academy Feed
        </LoadingButton>
      </form>
    </div>
  )
}
