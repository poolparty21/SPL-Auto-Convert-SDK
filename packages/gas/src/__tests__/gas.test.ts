import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mock connection
const mockConnection = {
  getBalance: vi.fn(),
}

function MockConnection() {
  return mockConnection
}

function MockPublicKey(key: string) {
  return { toString: () => key, toBase58: () => key }
}

vi.mock('@solana/web3.js', () => ({
  Connection: MockConnection,
  PublicKey: MockPublicKey,
}))

const { createGasManager } = await import('../index.js')

describe('@kololabs/gas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('checkBalance returns enough gas when balance is sufficient', async () => {
    mockConnection.getBalance.mockResolvedValue(2_000_000_000) // 2 SOL

    const mgr = createGasManager({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      minimumBalanceSol: 0.5,
    })

    const result = await mgr.checkBalance()
    expect(result.currentBalance).toBe(2)
    expect(result.hasEnoughGas).toBe(true)
    expect(result.deficit).toBe(0)
  })

  it('checkBalance reports deficit when balance is low', async () => {
    mockConnection.getBalance.mockResolvedValue(100_000_000) // 0.1 SOL

    const mgr = createGasManager({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      minimumBalanceSol: 0.5,
    })

    const result = await mgr.checkBalance()
    expect(result.currentBalance).toBe(0.1)
    expect(result.hasEnoughGas).toBe(false)
    expect(result.deficit).toBe(0.4)
  })

  it('needsTopUp returns true when balance is low', async () => {
    mockConnection.getBalance.mockResolvedValue(50_000_000) // 0.05 SOL

    const mgr = createGasManager({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      minimumBalanceSol: 0.5,
    })

    expect(await mgr.needsTopUp()).toBe(true)
  })
})
