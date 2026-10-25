'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  sendChatMessageAction,
  getChatMessagesAction,
  getChatRecipientsAction,
  markMessagesReadAction,
  sendTypingIndicatorAction,
  ChatMessageResult,
} from '@/actions/chat'
import { useToast } from './ToastProvider'

export interface ChatRecipient {
  id: string
  name: string
  sub: string
  type: string
}

export default function BatchChat({
  batchType: initialBatch,
  currentStudentId,
  isAdmin = false,
}: {
  batchType: string
  currentStudentId?: string
  isAdmin?: boolean
}) {
  const [category, setCategory] = useState<'GLOBAL' | 'BATCH' | 'PRIVATE'>('GLOBAL')
  const [activeRecipient, setActiveRecipient] = useState<{ id: string; name: string } | null>(null)
  const [recipients, setRecipients] = useState<ChatRecipient[]>([])
  const [messages, setMessages] = useState<ChatMessageResult[]>([])
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { showToast } = useToast()

  // Load available recipient list
  useEffect(() => {
    let mounted = true
    getChatRecipientsAction().then((data) => {
      if (mounted) setRecipients(data)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Determine active real-time channel name
  const getActiveChannel = useCallback(() => {
    if (category === 'GLOBAL') return 'global'
    if (category === 'BATCH') return `batch:${initialBatch}`
    if (category === 'PRIVATE' && activeRecipient) {
      const myId = currentStudentId || 'ADMIN'
      const sorted = [myId, activeRecipient.id].sort()
      return `dm:${sorted[0]}:${sorted[1]}`
    }
    return null
  }, [category, initialBatch, activeRecipient, currentStudentId])

  // Fetch initial message history
  useEffect(() => {
    let mounted = true
    const fetchInitial = async () => {
      const params: { category: 'GLOBAL' | 'BATCH' | 'PRIVATE'; batchType?: string; recipientId?: string } = { category }
      if (category === 'BATCH') params.batchType = initialBatch
      if (category === 'PRIVATE') {
        if (!activeRecipient) {
          if (mounted) setMessages([])
          return
        }
        params.recipientId = activeRecipient.id
      }
      const data = await getChatMessagesAction(params)
      if (mounted) setMessages(data)
    }

    fetchInitial()

    return () => {
      mounted = false
    }
  }, [category, initialBatch, activeRecipient])

  // Real-Time Server-Sent Events (SSE) Subscription
  useEffect(() => {
    const channel = getActiveChannel()
    if (!channel) return

    const url = `/api/realtime/events?channels=${encodeURIComponent(channel)}`
    const eventSource = new EventSource(url)

    eventSource.addEventListener('chat.message', (e) => {
      try {
        const payload = JSON.parse(e.data)
        const newMsg = payload.data?.message
        if (!newMsg) return

        setMessages((prev) => {
          // Deduplicate if already rendered optimistically via clientMsgId or id
          const exists = prev.some(
            (m) =>
              m.id === newMsg.id ||
              (newMsg.clientMsgId && m.clientMsgId === newMsg.clientMsgId)
          )
          if (exists) {
            return prev.map((m) =>
              newMsg.clientMsgId && m.clientMsgId === newMsg.clientMsgId ? newMsg : m
            )
          }
          return [...prev, newMsg]
        })

        // Auto mark as read if not own message
        const isOwn = newMsg.isAdmin ? isAdmin : currentStudentId && newMsg.senderId === currentStudentId
        if (!isOwn) {
          markMessagesReadAction({ messageIds: [newMsg.id], channel })
        }
      } catch (err) {
        console.warn('[REALTIME] Failed to parse message event:', err)
      }
    })

    eventSource.addEventListener('chat.read', (e) => {
      try {
        const payload = JSON.parse(e.data)
        const readIds = payload.data?.messageIds as string[] | undefined
        if (readIds && readIds.length > 0) {
          setMessages((prev) =>
            prev.map((m) => (readIds.includes(m.id) ? { ...m, status: 'READ' } : m))
          )
        }
      } catch {
        // Ignore parse error
      }
    })

    eventSource.addEventListener('chat.typing', () => {
      setIsTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000)
    })

    // Serverless Resiliency: Automatic short-polling fallback when SSE connection drops
    let pollInterval: NodeJS.Timeout | null = null
    eventSource.onerror = () => {
      if (!pollInterval) {
        pollInterval = setInterval(async () => {
          try {
            const since = new Date(Date.now() - 10000).toISOString()
            const res = await fetch(
              `/api/realtime/poll?channels=${encodeURIComponent(channel)}&since=${encodeURIComponent(since)}`
            )
            if (!res.ok) return
            const data = await res.json()
            if (data.messages && data.messages.length > 0) {
              setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id))
                const incoming = Array.isArray(data.messages) ? (data.messages as ChatMessageResult[]) : []
                const newItems = incoming.filter((m) => !existingIds.has(m.id))
                return newItems.length > 0 ? [...prev, ...newItems] : prev
              })
            }
          } catch {
            // Polling network blip; continue next cycle
          }
        }, 5000)
      }
    }

    return () => {
      eventSource.close()
      if (pollInterval) clearInterval(pollInterval)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [getActiveChannel, isAdmin, currentStudentId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Handle typing notification
  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value)
    const channel = getActiveChannel()
    if (channel && e.target.value.length > 0) {
      sendTypingIndicatorAction({ channel })
    }
  }

  // Handle Send with clientMsgId and optimistic dispatch
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !file) || sending) return
    setSending(true)

    const clientMsgId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `cmsg_${crypto.randomUUID()}`
      : `cmsg_${Date.now()}`
    const formData = new FormData()
    formData.append('content', content)
    formData.append('category', category)
    formData.append('clientMsgId', clientMsgId)
    if (category === 'BATCH') formData.append('batchType', initialBatch)
    if (category === 'PRIVATE' && activeRecipient) formData.append('recipientId', activeRecipient.id)
    if (file) formData.append('file', file)

    // Optimistic UI representation
    const optimisticMsg: ChatMessageResult = {
      id: clientMsgId,
      clientMsgId,
      content,
      senderName: isAdmin ? 'Admin' : 'You',
      isAdmin,
      senderId: currentStudentId || null,
      category,
      batchType: category === 'BATCH' ? initialBatch : null,
      recipientId: category === 'PRIVATE' && activeRecipient ? activeRecipient.id : null,
      fileUrl: file ? URL.createObjectURL(file) : null,
      fileType: file ? (file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT') : null,
      fileName: file?.name || null,
      status: 'SENT',
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setContent('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    const result = await sendChatMessageAction(formData)
    if (!result.success) {
      setMessages((prev) => prev.filter((m) => m.clientMsgId !== clientMsgId))
      showToast(result.error || 'Message dispatch failed.', 'ERROR')
    }
    setSending(false)
  }

  const channels = [
    { key: 'GLOBAL' as const, icon: '🌐', label: 'Global' },
    { key: 'BATCH' as const, icon: '👥', label: initialBatch },
    { key: 'PRIVATE' as const, icon: '🔒', label: 'Private' },
  ]

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.15)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      {/* Top bar with channel tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}
      >
        {channels.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setCategory(ch.key)}
            style={{
              flex: 1,
              padding: '0.55rem 0.5rem',
              border: 'none',
              cursor: 'pointer',
              background: category === ch.key ? 'rgba(255,255,255,0.04)' : 'transparent',
              borderBottom: category === ch.key ? '2px solid hsl(var(--accent-red))' : '2px solid transparent',
              color: category === ch.key ? '#fff' : 'hsl(var(--text-muted))',
              fontSize: '0.7rem',
              fontWeight: 700,
              transition: '0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>{ch.icon}</span>
            {ch.label}
          </button>
        ))}
      </div>

      {/* Private recipients bar */}
      {category === 'PRIVATE' && (
        <div
          style={{
            padding: '0.5rem 0.65rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.15)',
            maxHeight: '100px',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {recipients.length === 0 ? (
              <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>No contacts available.</span>
            ) : (
              recipients.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRecipient(r)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid transparent',
                    background:
                      activeRecipient?.id === r.id ? 'hsla(343, 100%, 50%, 0.1)' : 'rgba(255,255,255,0.03)',
                    borderColor:
                      activeRecipient?.id === r.id ? 'hsla(343, 100%, 50%, 0.3)' : 'var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {r.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minHeight: 0,
        }}
      >
        {category === 'PRIVATE' && !activeRecipient ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.3 }}>🔒</div>
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', maxWidth: '200px', margin: '0 auto' }}>
                Select an athlete or administrator to start conversation.
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📡</div>
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>No messages yet. Real-time active.</p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isOwn = m.isAdmin ? isAdmin : currentStudentId && m.senderId === currentStudentId
            const isRead = m.status === 'READ'

            return (
              <div key={m.id || m.clientMsgId} style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    marginBottom: '0.2rem',
                    gap: '0.35rem',
                    alignItems: 'center',
                    padding: '0 0.35rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      color: 'hsl(var(--text-muted))',
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.senderName}
                  </span>
                  {m.isAdmin && (
                    <span
                      style={{
                        background: 'hsl(var(--accent-red-glow))',
                        color: 'hsl(var(--accent-red))',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.3rem',
                        borderRadius: '3px',
                      }}
                    >
                      ADMIN
                    </span>
                  )}
                </div>
                <div
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '12px',
                    borderTopRightRadius: isOwn ? '3px' : '12px',
                    borderTopLeftRadius: isOwn ? '12px' : '3px',
                    background: isOwn ? 'hsla(343, 100%, 50%, 0.12)' : 'rgba(255,255,255,0.04)',
                    border: isOwn ? '1px solid hsla(343, 100%, 50%, 0.25)' : '1px solid var(--border-subtle)',
                  }}
                >
                  {m.content && (
                    <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.45, color: '#e2e8f0' }}>{m.content}</p>
                  )}
                  {m.fileUrl && (
                    <div style={{ marginTop: m.content ? '0.5rem' : 0 }}>
                      {m.fileType === 'IMAGE' ? (
                        <Image
                          unoptimized
                          src={m.fileUrl}
                          alt="Chat image attachment"
                          width={320}
                          height={200}
                          style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', borderRadius: '8px', display: 'block' }}
                        />
                      ) : (
                        <a
                          href={m.fileUrl}
                          download
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: 'hsl(var(--accent-blue))',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          📄 {m.fileName || 'Document'}
                        </a>
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '0.5rem',
                      color: 'hsl(var(--text-muted))',
                      marginTop: '0.35rem',
                      textAlign: 'right',
                      fontWeight: 600,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isOwn && (
                      <span
                        style={{
                          color: isRead ? '#10b981' : 'hsl(var(--text-muted))',
                          fontWeight: 800,
                          fontSize: '0.65rem',
                        }}
                        title={isRead ? 'Read' : 'Sent'}
                      >
                        {isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Real-time typing bubble */}
        {isTyping && (
          <div style={{ alignSelf: 'flex-start', padding: '0.25rem 0.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
              Athlete is typing...
            </span>
          </div>
        )}
      </div>

      {/* Input controls */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '0.5rem 0.65rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            flexShrink: 0,
            background: file ? 'hsl(var(--accent-blue-glow))' : 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.85rem',
            color: '#fff',
          }}
        >
          {file ? '📎' : '+'}
        </button>
        <input
          type="text"
          value={content}
          disabled={category === 'PRIVATE' && !activeRecipient}
          onChange={handleContentChange}
          placeholder={category === 'PRIVATE' && !activeRecipient ? 'Select contact...' : 'Type a message...'}
          style={{
            flex: 1,
            padding: '0.45rem 0.75rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            color: '#fff',
            outline: 'none',
            fontSize: '0.78rem',
          }}
        />
        <button
          type="submit"
          disabled={sending || (category === 'PRIVATE' && !activeRecipient)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            flexShrink: 0,
            background: 'hsl(var(--accent-red))',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.85rem',
            opacity: sending || (category === 'PRIVATE' && !activeRecipient) ? 0.5 : 1,
            transition: '0.15s',
          }}
        >
          🚀
        </button>
      </form>
    </div>
  )
}
