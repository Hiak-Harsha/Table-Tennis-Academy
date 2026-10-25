'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/notifications'
import { useToast } from './ToastProvider'

interface NotificationItem {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
  title?: string
}

export default function NotificationBell({ userId: initialUserId }: { userId?: string }) {
  const [userId, setUserId] = useState<string | null>(initialUserId || null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // Load initial notification list, unread count, and user ID
  useEffect(() => {
    let mounted = true
    getNotificationsAction().then((data) => {
      if (mounted) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
        if (data.userId && !userId) {
          setUserId(data.userId)
        }
      }
    })
    return () => {
      mounted = false
    }
  }, [userId])

  // Subscribe to real-time notifications via SSE
  useEffect(() => {
    if (!userId) return

    const channels = `user:${userId},global`
    const url = `/api/realtime/events?channels=${encodeURIComponent(channels)}`
    const eventSource = new EventSource(url)

    eventSource.addEventListener('notification.new', (e) => {
      try {
        const payload = JSON.parse(e.data)
        const newNotif = payload.data?.notification
        if (!newNotif) return

        setNotifications((prev) => [newNotif, ...prev])
        setUnreadCount((prev) => prev + 1)
        showToast(`🔔 ${newNotif.message}`, 'INFO')
      } catch (err) {
        console.warn('[REALTIME_NOTIF_ERROR]', err)
      }
    })

    eventSource.addEventListener('broadcast.new', (e) => {
      try {
        const payload = JSON.parse(e.data)
        const broadcast = payload.data?.broadcast
        if (!broadcast) return

        const item = {
          id: broadcast.id,
          type: 'BROADCAST',
          message: `${broadcast.title}: ${broadcast.message}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }

        setNotifications((prev) => [item, ...prev])
        setUnreadCount((prev) => prev + 1)
        showToast(`📢 Announcement: ${broadcast.title}`, 'INFO')
      } catch (err) {
        console.warn('[REALTIME_BROADCAST_ERROR]', err)
      }
    })

    // Serverless Resiliency: Automatic short-polling fallback when SSE connection drops
    let pollInterval: NodeJS.Timeout | null = null
    eventSource.onerror = () => {
      if (!pollInterval) {
        pollInterval = setInterval(async () => {
          try {
            const since = new Date(Date.now() - 10000).toISOString()
            const res = await fetch(
              `/api/realtime/poll?channels=${encodeURIComponent(channels)}&since=${encodeURIComponent(since)}`
            )
            if (!res.ok) return
            const data = await res.json()
            if (data.notifications && data.notifications.length > 0) {
              setNotifications((prev) => {
                const existingIds = new Set(prev.map((n) => n.id))
                const newItems = data.notifications.filter((n: any) => !existingIds.has(n.id))
                if (newItems.length > 0) {
                  setUnreadCount((count) => count + newItems.length)
                  return [...newItems, ...prev]
                }
                return prev
              })
            }
          } catch {
            // Polling network blip
          }
        }, 8000)
      }
    }

    return () => {
      eventSource.close()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [userId, showToast])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const handleItemClick = async (notifId: string) => {
    await markNotificationReadAction(notifId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          width: '36px',
          height: '36px',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          color: '#fff',
          fontSize: '1rem',
          transition: 'all 0.2s',
        }}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '10px',
              padding: '0.1rem 0.35rem',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '16px',
              textAlign: 'center',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
              animation: 'pulse 2s infinite',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="glass"
          style={{
            position: 'absolute',
            top: '46px',
            right: 0,
            width: '320px',
            maxHeight: '380px',
            overflowY: 'auto',
            background: 'rgba(18, 18, 24, 0.98)',
            border: '1px solid var(--border-medium)',
            borderRadius: '16px',
            padding: '1rem',
            zIndex: 9999,
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            color: '#fff',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Live Alerts</div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--accent-blue))',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n.id)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '10px',
                    background: n.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(239, 68, 68, 0.08)',
                    border: n.isRead ? '1px solid transparent' : '1px solid rgba(239, 68, 68, 0.25)',
                    cursor: 'pointer',
                    transition: '0.15s',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.78rem', color: n.isRead ? '#94a3b8' : '#fff', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem', display: 'block' }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
