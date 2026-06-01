import { VersionedTransaction } from '@solana/web3.js'
import { Buffer } from 'node:buffer'

const JUPITER_BASE_URL = 'https://api.jup.ag/swap/v2'

export interface QuoteParams {
  inputMint: string
  outputMint: string
  amount: string
  slippageBps: number
}

export interface QuoteResponse {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  priceImpactPct: string
  routePlan: Array<{ swapInfo: { ammKey: string; label: string } }>
}

export interface SwapParams {
  quoteResponse: QuoteResponse
  userPublicKey: string
  wrapAndUnwrapSol?: boolean
  useSharedAccounts?: boolean
}

export interface RouterConfig {
  baseUrl?: string
  apiKey?: string
}

interface JupiterQuoteResponse {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  priceImpactPct: string
  routePlan: Array<{ swapInfo: { ammKey: string; label: string } }>
}

interface JupiterSwapResponse {
  swapTransaction: string
  lastValidBlockHeight: number
  prioritizationFeeLamports: number
}

export function createRouter(config?: RouterConfig) {
  const baseUrl = config?.baseUrl ?? JUPITER_BASE_URL
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config?.apiKey) {
    headers['x-api-key'] = config.apiKey
  }

  const getQuote = async (params: QuoteParams): Promise<QuoteResponse> => {
    const url = new URL(baseUrl + '/quote')
    url.searchParams.set('inputMint', params.inputMint)
    url.searchParams.set('outputMint', params.outputMint)
    url.searchParams.set('amount', params.amount)
    url.searchParams.set('slippageBps', String(params.slippageBps))

    const response = await globalThis.fetch(url.toString(), { headers })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Jupiter quote failed (${response.status}): ${text}`)
    }

    const data = (await response.json()) as JupiterQuoteResponse
    return {
      inputMint: data.inputMint,
      outputMint: data.outputMint,
      inAmount: data.inAmount,
      outAmount: data.outAmount,
      otherAmountThreshold: data.otherAmountThreshold,
      priceImpactPct: data.priceImpactPct,
      routePlan: data.routePlan,
    }
  }

  const getSwapTransaction = async (params: SwapParams): Promise<VersionedTransaction> => {
    const response = await globalThis.fetch(baseUrl + '/swap', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        quoteResponse: params.quoteResponse,
        userPublicKey: params.userPublicKey,
        wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
        useSharedAccounts: params.useSharedAccounts ?? true,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Jupiter swap failed (${response.status}): ${text}`)
    }

    const data = (await response.json()) as JupiterSwapResponse
    const txBuffer = Buffer.from(data.swapTransaction, 'base64')
    return VersionedTransaction.deserialize(txBuffer)
  }

  return { getQuote, getSwapTransaction }
}

export type Router = ReturnType<typeof createRouter>
