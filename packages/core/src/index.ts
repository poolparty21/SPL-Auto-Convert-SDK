import { createListener, type TransferEvent, type Listener } from '@kololabs/listener'
import { createGasManager, type GasManager } from '@kololabs/gas'
import { createRouter, type Router, type QuoteResponse } from '@kololabs/router'

// USDT mint address on Solana
export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
// SOL mint address
export const SOL_MINT = 'So11111111111111111111111111111111111111112'

export interface KoloEngineConfig {
  /** Helius or other RPC endpoint */
  rpcUrl: string
  /** The wallet address to monitor and swap from */
  walletAddress: string
  /** Minimum SOL balance required before attempting swaps */
  minimumBalanceSol: number
  /** Slippage tolerance in basis points (default: 50 = 0.5%) */
  slippageBps?: number
  /** Jupiter API key (optional) */
  jupiterApiKey?: string
  /** Callback when a swap is completed */
  onSwapComplete?: (event: { signature: string; inputAmount: string; outputAmount: string }) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

export class KoloEngine {
  private config: Required<KoloEngineConfig>
  private listener: Listener | null = null
  private gasManager: GasManager | null = null
  private router: Router | null = null
  private running = false

  constructor(config: KoloEngineConfig) {
    this.config = {
      rpcUrl: config.rpcUrl,
      walletAddress: config.walletAddress,
      minimumBalanceSol: config.minimumBalanceSol,
      slippageBps: config.slippageBps ?? 50,
      jupiterApiKey: config.jupiterApiKey ?? '',
      onSwapComplete: config.onSwapComplete ?? (() => {}),
      onError: config.onError ?? ((err) => console.error('[KoloEngine]', err)),
    }
  }

  /**
   * Start monitoring USDT transfers and executing swaps.
   */
  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    this.gasManager = createGasManager({
      rpcUrl: this.config.rpcUrl,
      walletAddress: this.config.walletAddress,
      minimumBalanceSol: this.config.minimumBalanceSol,
    })

    this.router = createRouter({
      apiKey: this.config.jupiterApiKey || undefined,
    })

    this.listener = createListener({
      rpcUrl: this.config.rpcUrl,
      walletAddress: this.config.walletAddress,
      onTransfer: this.handleTransfer.bind(this),
      onError: this.config.onError,
    })

    await this.listener.start()
  }

  /**
   * Stop monitoring and clean up.
   */
  stop(): void {
    this.running = false
    this.listener?.stop()
    this.listener = null
    this.gasManager = null
    this.router = null
  }

  /**
   * Handle an incoming USDT transfer: check gas → get quote → swap → callback.
   */
  private async handleTransfer(event: TransferEvent): Promise<void> {
    if (!this.running) return

    try {
      // Step 1: Check if we have enough gas
      if (!this.gasManager) return
      const { hasEnoughGas } = await this.gasManager.checkBalance()

      if (!hasEnoughGas) {
        this.config.onError(
          new Error(`Insufficient SOL balance to execute swap. Deficit detected.`),
        )
        return
      }

      // Step 2: Get a quote to swap received USDT to SOL
      if (!this.router) return
      const quote = await this.router.getQuote({
        inputMint: USDT_MINT,
        outputMint: SOL_MINT,
        amount: event.amount,
        slippageBps: this.config.slippageBps,
      })

      // Step 3: Get the swap transaction
      const versionedTx = await this.router.getSwapTransaction({
        quoteResponse: quote,
        userPublicKey: this.config.walletAddress,
      })

      // Note: The actual signing and sending is expected to be handled externally
      // by the user who holds the private key. The SDK returns the prepared transaction.
      this.config.onSwapComplete({
        signature: `pending:${event.signature}`,
        inputAmount: event.amount,
        outputAmount: quote.outAmount,
      })
    } catch (err) {
      this.config.onError(
        err instanceof Error ? err : new Error(String(err)),
      )
    }
  }
}

/**
 * Create a new KoloEngine instance.
 */
export function createEngine(config: KoloEngineConfig): KoloEngine {
  return new KoloEngine(config)
}
