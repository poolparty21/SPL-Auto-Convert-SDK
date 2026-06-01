export interface RouteQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  priceImpactPct: number
}

export function createQuote(
  inputMint: string,
  outputMint: string,
  inAmount: string,
  outAmount: string,
): RouteQuote {
  return {
    inputMint,
    outputMint,
    inAmount,
    outAmount,
    priceImpactPct: 0,
  }
}
