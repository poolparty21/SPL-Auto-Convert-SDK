import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mock connection
const mockConnection = {
  onLogs: vi.fn(() => 123),
  removeOnLogsListener: vi.fn(() => Promise.resolve()),
  getParsedTransaction: vi.fn(),
}

class MockPublicKey {
  private key: string
  constructor(key: string) {
    this.key = key
  }
  toString() { return this.key }
  toBase58() { return this.key }
  toBytes() { return new Uint8Array(32) }
  equals(other: any) { return this.key === (other?.key ?? other) }
}

vi.mock('@solana/web3.js', () => {
  function Connection() {
    return mockConnection
  }

  return {
    Connection,
    PublicKey: MockPublicKey,
    Logs: {},
    Context: class {},
  }
})

const { createListener, USDT_MINT } = await import('../index.js')

describe('@kololabs/listener', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createListener returns object with start and stop', () => {
    const listener = createListener({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      onTransfer: vi.fn(),
      onError: vi.fn(),
    })

    expect(listener).toHaveProperty('start')
    expect(listener).toHaveProperty('stop')
    expect(typeof listener.start).toBe('function')
    expect(typeof listener.stop).toBe('function')
  })

  it('start calls connection.onLogs with USDT mint filter', async () => {
    const listener = createListener({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      onTransfer: vi.fn(),
      onError: vi.fn(),
    })

    await listener.start()

    expect(mockConnection.onLogs).toHaveBeenCalledWith(
      { mentions: [USDT_MINT] },
      expect.any(Function),
      'confirmed',
    )
  })

  it('stop removes the subscription', async () => {
    const listener = createListener({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      onTransfer: vi.fn(),
      onError: vi.fn(),
    })

    await listener.start()
    listener.stop()

    expect(mockConnection.removeOnLogsListener).toHaveBeenCalledWith(123)
  })
})
