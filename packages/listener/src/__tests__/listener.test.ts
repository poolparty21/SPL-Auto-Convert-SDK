import { describe, it, expect } from 'vitest'
import { parseWebhook } from '../index.js'

describe('@kololabs/listener', () => {
  it('parseWebhook returns null for invalid input', () => {
    expect(parseWebhook(null)).toBeNull()
    expect(parseWebhook({})).toBeNull()
  })

  it('parseWebhook returns parsed payload for valid input', () => {
    const payload = parseWebhook({
      event: 'SWAP',
      signature: 'abc123',
      timestamp: 1700000000,
    })
    expect(payload).toEqual({
      event: 'SWAP',
      signature: 'abc123',
      timestamp: 1700000000,
    })
  })
})
