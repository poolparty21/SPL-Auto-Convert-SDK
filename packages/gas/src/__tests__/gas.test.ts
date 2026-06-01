import { describe, it, expect } from 'vitest'
import { estimateGas, formatGas } from '../index.js'

describe('@kololabs/gas', () => {
  it('estimateGas computes gas cost', () => {
    expect(estimateGas(1000, 0.000005)).toBe(0.005)
  })

  it('formatGas returns formatted string', () => {
    expect(formatGas(5000)).toBe('5000 lamports')
  })
})
