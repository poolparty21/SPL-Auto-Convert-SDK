import { describe, it, expect } from 'vitest'
import { greet, add } from '../index.js'

describe('@kololabs/core', () => {
  it('greet returns a greeting', () => {
    expect(greet('World')).toBe('Hello from @kololabs/core, World!')
  })

  it('add sums two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
