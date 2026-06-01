import { add } from '@kololabs/core'

export function estimateGas(units: number, price: number): number {
  return add(units * price, 0)
}

export function formatGas(gas: number): string {
  return `${gas} lamports`
}
