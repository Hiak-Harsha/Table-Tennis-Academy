import { describe, it, expect, beforeEach } from 'vitest'
import { realtimeBus } from '@/lib/realtime/bus'
import { RealtimeMessage } from '@/lib/realtime/events'

describe('Real-Time In-Memory Event Bus & Replay Buffer', () => {
  const testChannelA = `test:channel:a:${Date.now()}`
  const testChannelB = `test:channel:b:${Date.now()}`

  beforeEach(() => {
    // Fresh state for each test
  })

  it('publishes an event with structured metadata and returns message object', () => {
    const payload = { text: 'hello world', count: 42 }
    const msg = realtimeBus.publish(testChannelA, 'chat.message', payload)

    expect(msg).toBeDefined()
    expect(msg.id).toMatch(/^evt_\d+_\d+$/)
    expect(msg.channel).toBe(testChannelA)
    expect(msg.type).toBe('chat.message')
    expect(msg.data).toEqual(payload)
    expect(typeof msg.timestamp).toBe('number')
  })

  it('dispatches messages to subscribed channel listeners', () => {
    const received: RealtimeMessage[] = []
    const unsubscribe = realtimeBus.subscribe([testChannelA], (msg) => {
      received.push(msg)
    })

    try {
      realtimeBus.publish(testChannelA, 'chat.message', { content: 'msg-1' })
      realtimeBus.publish(testChannelB, 'chat.message', { content: 'msg-2' })
      realtimeBus.publish(testChannelA, 'chat.typing', { isTyping: true })

      expect(received).toHaveLength(2)
      expect(received[0].data).toEqual({ content: 'msg-1' })
      expect(received[1].data).toEqual({ isTyping: true })
    } finally {
      unsubscribe()
    }
  })

  it('stops receiving messages after unsubscribe callback is invoked', () => {
    const received: RealtimeMessage[] = []
    const unsubscribe = realtimeBus.subscribe([testChannelA], (msg) => {
      received.push(msg)
    })

    realtimeBus.publish(testChannelA, 'chat.message', { id: 1 })
    expect(received).toHaveLength(1)

    // Unsubscribe
    unsubscribe()

    realtimeBus.publish(testChannelA, 'chat.message', { id: 2 })
    expect(received).toHaveLength(1) // No new message
  })

  it('supports multi-channel subscriptions', () => {
    const received: RealtimeMessage[] = []
    const unsubscribe = realtimeBus.subscribe([testChannelA, testChannelB], (msg) => {
      received.push(msg)
    })

    try {
      realtimeBus.publish(testChannelA, 'chat.message', { source: 'A' })
      realtimeBus.publish(testChannelB, 'chat.message', { source: 'B' })

      expect(received).toHaveLength(2)
      expect(received[0].channel).toBe(testChannelA)
      expect(received[1].channel).toBe(testChannelB)
    } finally {
      unsubscribe()
    }
  })

  it('retrieves backfill events since a lastEventId for reconnection recovery', () => {
    const ch = `test:backfill:${Date.now()}`
    const msg1 = realtimeBus.publish(ch, 'chat.message', { seq: 1 })
    const msg2 = realtimeBus.publish(ch, 'chat.message', { seq: 2 })
    const msg3 = realtimeBus.publish(ch, 'chat.message', { seq: 3 })

    // Replay since msg1 should return msg2 and msg3
    const backfill = realtimeBus.getEventsSince(msg1.id, [ch])
    expect(backfill).toHaveLength(2)
    expect(backfill[0].id).toBe(msg2.id)
    expect(backfill[1].id).toBe(msg3.id)

    // Replay since msg3 should return empty array
    const emptyBackfill = realtimeBus.getEventsSince(msg3.id, [ch])
    expect(emptyBackfill).toHaveLength(0)

    // Filter respects requested channels
    const otherChannelBackfill = realtimeBus.getEventsSince(msg1.id, ['unrelated-ch'])
    expect(otherChannelBackfill).toHaveLength(0)
  })

  it('caps replay buffer to maximum capacity without unbounded memory growth', () => {
    const ch = `test:buffer-overflow:${Date.now()}`
    // MAX_REPLAY_BUFFER is 100
    for (let i = 0; i < 110; i++) {
      realtimeBus.publish(ch, 'chat.message', { seq: i })
    }

    // Since we published 110 events, fetching all from unknown lastEventId should return at most 100
    const all = realtimeBus.getEventsSince('unknown_id', [ch])
    expect(all.length).toBeLessThanOrEqual(100)
  })
})
