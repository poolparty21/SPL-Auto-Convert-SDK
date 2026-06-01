import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

const mockFetch = vi.fn()
const origFetch = globalThis.fetch

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.fetch = mockFetch
})

afterAll(() => {
  globalThis.fetch = origFetch
})

describe('@kololabs/router', () => {
  it('createRouter returns object with getQuote and getSwapTransaction', async () => {
    const { createRouter } = await import('../index.js')
    const router = createRouter()
    expect(router).toHaveProperty('getQuote')
    expect(router).toHaveProperty('getSwapTransaction')
  })

  it('getQuote constructs correct URL and returns quote', async () => {
    const { createRouter } = await import('../index.js')
    const mockQuoteResponse = {
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      inAmount: '1000000000',
      outAmount: '95000000',
      otherAmountThreshold: '94000000',
      priceImpactPct: '0.05',
      routePlan: [{ swapInfo: { ammKey: 'amm1', label: 'Orca' } }],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQuoteResponse,
    })

    const router = createRouter({ baseUrl: 'https://api.jup.ag/swap/v2' })
    const quote = await router.getQuote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      amount: '1000000000',
      slippageBps: 50,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(quote.inAmount).toBe('1000000000')
    expect(quote.outAmount).toBe('95000000')
    expect(quote.priceImpactPct).toBe('0.05')
  })

  it('getQuote throws on non-ok response', async () => {
    const { createRouter } = await import('../index.js')
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad request',
    })

    const router = createRouter()
    await expect(router.getQuote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      amount: '1000000000',
      slippageBps: 50,
    })).rejects.toThrow('Jupiter quote failed (400): Bad request')
  })
})
