export type WebhookEvent = 'SWAP' | 'TRANSFER' | 'ACCOUNT_CHANGE'

export interface WebhookPayload {
  event: WebhookEvent
  signature: string
  timestamp: number
}

export function parseWebhook(data: unknown): WebhookPayload | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (
    typeof d.event !== 'string' ||
    typeof d.signature !== 'string' ||
    typeof d.timestamp !== 'number'
  ) {
    return null
  }
  return { event: d.event as WebhookEvent, signature: d.signature, timestamp: d.timestamp }
}
