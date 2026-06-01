import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kololabs/listener', () => ({
  createListener: vi.fn(() => ({
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  })),
  USDT_MINT: { toBase58: () => 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  TOKEN_PROGRAM_ID: { toBase58: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
}))

vi.mock('@kololabs/gas', () => ({
  createGasManager: vi.fn(() => ({
    checkBalance: vi.fn(() => Promise.resolve({
      currentBalance: 2,
      hasEnoughGas: true,
      deficit: 0,
    })),
    needsTopUp: vi.fn(() => Promise.resolve(false)),
  })),
}))

vi.mock('@kololabs/router', () => ({
  createRouter: vi.fn(() => ({
    getQuote: vi.fn(() => Promise.resolve({
      inputMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      outputMint: 'So11111111111111111111111111111111111111112',
      inAmount: '1000000',
      outAmount: '5000000',
      otherAmountThreshold: '4950000',
      priceImpactPct: '0.1',
      routePlan: [],
    })),
    getSwapTransaction: vi.fn(() => Promise.resolve({
      signatures: [],
      message: {},
    })),
  })),
}))

const { KoloEngine, createEngine, USDT_MINT, SOL_MINT } = await import('../index.js')

describe('@kololabs/core - KoloEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createEngine returns a KoloEngine instance', () => {
    const engine = createEngine({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      minimumBalanceSol: 0.5,
    })
    expect(engine).toBeInstanceOf(KoloEngine)
  })

  it('start() initializes gas manager, router, and listener', async () => {
    const engine = createEngine({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      minimumBalanceSol: 0.5,
    })

    const { createGasManager } = await import('@kololabs/gas')
    const { createListener } = await import('@kololabs/listener')
    const { createRouter } = await import('@kololabs/router')

    await engine.start()

    expect(createGasManager).toHaveBeenCalled()
    expect(createListener).toHaveBeenCalled()
    expect(createRouter).toHaveBeenCalled()
  })

  it('stop() cleans up the listener', async () => {
    const engine = createEngine({
      rpcUrl: 'https://test.com',
      walletAddress: '11111111111111111111111111111111',
      minimumBalanceSol: 0.5,
    })

    const { createListener } = await import('@kololabs/listener')

    await engine.start()
    engine.stop()

    const listenerMock = (createListener as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(listenerMock.stop).toHaveBeenCalled()
  })

  it('exports USDT_MINT and SOL_MINT constants', () => {
    expect(USDT_MINT).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
    expect(SOL_MINT).toBe('So11111111111111111111111111111111111111112')
  })
})
