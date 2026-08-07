'use client'

import { useState, useEffect, useRef } from 'react'
import { sendChatMessageAction, getChatMessagesAction, getChatRecipientsAction } from '@/actions/chat'
import { useToast } from './ToastProvider'
import LoadingButton from './LoadingButton'

export default function BatchChat({
  batchType: initialBatch,
  currentStudentId,
  isAdmin = false
}: {
  batchType: string;
  currentStudentId?: string;
  isAdmin?: boolean
}) {
  const [category, setCategory] = useState<'GLOBAL' | 'BATCH' | 'PRIVATE'>('GLOBAL')
  const [activeRecipient, setActiveRecipient] = useState<{id: string, name: string} | null>(null)
  const [recipients, setRecipients] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const loadRecipients = async () => {
      const data = await getChatRecipientsAction()
      setRecipients(data)
    }
    loadRecipients()
  }, [])

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      const params: any = { category }
      if (category === 'BATCH') params.batchType = initialBatch
      if (category === 'PRIVATE') {
        if (!activeRecipient) return setMessages([])
        params.recipientId = activeRecipient.id
      }
      const data = await getChatMessagesAction(params)
      setMessages(data)
      setLoading(false)
    }
    fetchMessages()
    const interval = setInterval(fetchMessages, 8000)
    return () => clearInterval(interval)
  }, [category, initialBatch, activeRecipient])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !file) || sending) return
    setSending(true)
    const formData = new FormData()
    formData.append('content', content)
    formData.append('category', category)
    if (category === 'BATCH') formData.append('batchType', initialBatch)
    if (category === 'PRIVATE' && activeRecipient) formData.append('recipientId', activeRecipient.id)
    if (file) formData.append('file', file)

    const tempId = 'TEMP-' + Math.random()
    const optimisticMsg = {
      id: tempId, content, senderName: isAdmin ? 'Admin' : 'You', isAdmin,
      senderId: currentStudentId, fileUrl: file ? URL.createObjectURL(file) : null,
      fileType: file?.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
      fileName: file?.name, createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimisticMsg])

    const result = await sendChatMessageAction(formData)
    if (result.success) {
      setContent(''); setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      showToast(result.error || 'Message failed.', 'ERROR')
    }
    setSending(false)
  }

  const channels = [
    { key: 'GLOBAL' as const, icon: '🌐', label: 'Global' },
    { key: 'BATCH' as const, icon: '👥', label: initialBatch },
    { key: 'PRIVATE' as const, icon: '🔒', label: 'Private' },
  ]

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)',
      borderRadius: '10px', overflow: 'hidden'
    }}>

      {/* Top bar with channel tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
        {channels.map(ch => (
          <button key={ch.key} onClick={() => setCategory(ch.key)} style={{
            flex: 1, padding: '0.55rem 0.5rem', border: 'none', cursor: 'pointer',
            background: category === ch.key ? 'rgba(255,255,255,0.04)' : 'transparent',
            borderBottom: category === ch.key ? '2px solid hsl(var(--accent-red))' : '2px solid transparent',
            color: category === ch.key ? '#fff' : 'hsl(var(--text-muted))',
            fontSize: '0.7rem', fontWeight: 700, transition: '0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
          }}>
            <span style={{ fontSize: '0.75rem' }}>{ch.icon}</span>{ch.label}
          </button>
        ))}
      </div>

      {/* Private recipients sidebar - only when PRIVATE is selected */}
      {category === 'PRIVATE' && (
        <div style={{
          padding: '0.5rem 0.65rem', borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.15)', maxHeight: '100px', overflowY: 'auto', flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {recipients.length === 0 ? (
              <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>No contacts.</span>
            ) : recipients.map(r => (
              <button key={r.id} onClick={() => setActiveRecipient(r)} style={{
                padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid transparent',
                background: activeRecipient?.id === r.id ? 'hsla(343, 100%, 50%, 0.1)' : 'rgba(255,255,255,0.03)',
                borderColor: activeRecipient?.id === r.id ? 'hsla(343, 100%, 50%, 0.3)' : 'var(--border-subtle)',
                color: '#fff', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
              }}>{r.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex',
        flexDirection: 'column', gap: '0.5rem', minHeight: 0
      }}>
        {category === 'PRIVATE' && !activeRecipient ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.3 }}>🔒</div>
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', maxWidth: '200px', margin: '0 auto' }}>Select a contact to start.</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📡</div>
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>No messages yet.</p>
            </div>
          </div>
        ) : messages.map((m) => {
          const isOwn = m.isAdmin ? isAdmin : (currentStudentId && m.senderId === currentStudentId)
          return (
            <div key={m.id} style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: '0.2rem', gap: '0.35rem', alignItems: 'center', padding: '0 0.35rem' }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>{m.senderName}</span>
                {m.isAdmin && <span style={{ background: 'hsl(var(--accent-red-glow))', color: 'hsl(var(--accent-red))', fontSize: '0.5rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: '3px' }}>ADMIN</span>}
              </div>
              <div style={{
                padding: '0.6rem 0.8rem', borderRadius: '12px',
                borderTopRightRadius: isOwn ? '3px' : '12px',
                borderTopLeftRadius: isOwn ? '12px' : '3px',
                background: isOwn ? 'hsla(343, 100%, 50%, 0.12)' : 'rgba(255,255,255,0.04)',
                border: isOwn ? '1px solid hsla(343, 100%, 50%, 0.25)' : '1px solid var(--border-subtle)',
              }}>
                {m.content && <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.45, color: '#e2e8f0' }}>{m.content}</p>}
                {m.fileUrl && (
                  <div style={{ marginTop: m.content ? '0.5rem' : 0 }}>
                    {m.fileType === 'IMAGE' ? (
                      <img src={m.fileUrl} alt="" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
                    ) : (
                      <a href={m.fileUrl} download style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', textDecoration: 'none', color: 'hsl(var(--accent-blue))', fontSize: '0.75rem', fontWeight: 600 }}>
                        📄 {m.fileName || 'File'}
                      </a>
                    )}
                  </div>
                )}
                <div style={{ fontSize: '0.5rem', color: 'hsl(var(--text-muted))', marginTop: '0.35rem', textAlign: 'right', fontWeight: 600, display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isOwn && <span style={{ color: '#10b981' }}>✓✓</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '0.5rem 0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center',
        borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.15)', flexShrink: 0
      }}>
        <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: file ? 'hsl(var(--accent-blue-glow))' : 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'grid', placeItems: 'center',
          fontSize: '0.85rem', color: '#fff'
        }}>{file ? '📎' : '+'}</button>
        <input type="text" value={content} disabled={category === 'PRIVATE' && !activeRecipient}
          onChange={(e) => setContent(e.target.value)}
          placeholder={category === 'PRIVATE' && !activeRecipient ? 'Select contact...' : 'Type a message...'}
          style={{
            flex: 1, padding: '0.45rem 0.75rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)', borderRadius: '20px',
            color: '#fff', outline: 'none', fontSize: '0.78rem'
          }} />
        <button type="submit" disabled={sending || (category === 'PRIVATE' && !activeRecipient)} style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: 'hsl(var(--accent-red))', border: 'none', color: '#fff',
          cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: '0.85rem',
          opacity: (sending || (category === 'PRIVATE' && !activeRecipient)) ? 0.5 : 1, transition: '0.15s'
        }}>🚀</button>
      </form>
    </div>
  )
}
