import { describe, it, expect } from 'vitest'
import { createQuote } from '../index.js'

describe('@kololabs/router', () => {
  it('createQuote returns a valid quote', () => {
    const quote = createQuote('SOL', 'USDT', '1000000000', '95000000')
    expect(quote.inputMint).toBe('SOL')
    expect(quote.outputMint).toBe('USDT')
    expect(quote.priceImpactPct).toBe(0)
  })
})
