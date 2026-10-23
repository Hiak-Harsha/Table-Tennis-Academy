export type ChannelName =
  | 'global'
  | 'admin:ops'
  | `batch:${string}`
  | `user:${string}`
  | `dm:${string}:${string}`

export type RealtimeEventType =
  | 'chat.message'
  | 'chat.read'
  | 'chat.typing'
  | 'notification.new'
  | 'broadcast.new'
  | 'payment.captured'

export interface RealtimeEventPayload {
  type: RealtimeEventType
  data: Record<string, unknown>
}

export interface RealtimeMessage {
  id: string
  channel: string
  type: RealtimeEventType
  data: Record<string, unknown>
  timestamp: number
}
