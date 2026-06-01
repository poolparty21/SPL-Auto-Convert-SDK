import { Connection, PublicKey, Logs, Context } from '@solana/web3.js'

// USDT mint address on Solana mainnet
export const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')

// SPL Token Program ID
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

export interface TransferEvent {
  signature: string
  slot: number
  mint: string
  amount: string
  sender: string
  receiver: string
}

export interface ListenerConfig {
  rpcUrl: string
  walletAddress: string
  onTransfer: (event: TransferEvent) => void
  onError: (error: Error) => void
}

export interface Listener {
  start: () => Promise<void>
  stop: () => void
}

/**
 * Parse a TransferEvent from a parsed transaction that involves the USDT mint
 * and matches the monitored wallet address.
 */
function parseTransferEvent(
  tx: any,
  walletAddress: string,
): TransferEvent | null {
  if (!tx.meta || !tx.transaction.message.instructions) return null

  const postBalances = tx.meta.postTokenBalances ?? []
  const preBalances = tx.meta.preTokenBalances ?? []

  // Find USDT balance changes involving the monitored wallet
  for (const post of postBalances) {
    if (post.mint !== USDT_MINT.toBase58()) continue

    const pre = preBalances.find((p: any) => p.accountIndex === post.accountIndex)
    if (!pre) continue

    const preAmount = Number(pre.uiTokenAmount?.uiAmount ?? 0)
    const postAmount = Number(post.uiTokenAmount?.uiAmount ?? 0)
    const diff = postAmount - preAmount

    if (Math.abs(diff) < 1e-12) continue

    const isReceiver = diff > 0
    const amount = Math.abs(diff).toString()
    const owner = post.owner?.toBase58?.() ?? post.owner ?? ''

    // Verify this involves our monitored wallet
    if (owner !== walletAddress && !tx.transaction.message.accountKeys.some(
      (k: any) => k.pubkey.toBase58() === walletAddress
    )) {
      continue
    }

    return {
      signature: tx.transaction.signatures[0] ?? '',
      slot: tx.slot,
      mint: USDT_MINT.toBase58(),
      amount,
      sender: isReceiver ? '' : owner,
      receiver: isReceiver ? owner : '',
    }
  }

  return null
}

/**
 * Create a Helius WebSocket SPL transfer monitor.
 *
 * Subscribes to logs mentioning the USDT mint, fetches parsed transactions,
 * and emits TransferEvent objects when a relevant transfer is detected.
 */
export function createListener(config: ListenerConfig): Listener {
  const connection = new Connection(config.rpcUrl)
  let subscriptionId: number | null = null
  let stopped = false

  const callback = async (logs: Logs, _ctx: Context) => {
    if (stopped) return

    try {
      if (logs.err) return

      // Look for Transfer log from the Token program
      const hasTransfer = logs.logs.some(
        log => log.includes('Program log: Instruction: Transfer')
      )
      if (!hasTransfer) return

      // Fetch the parsed transaction
      const tx = await (connection as any).getParsedTransaction(logs.signature, {
        maxSupportedTransactionVersion: 0,
      })

      if (!tx) return

      const event = parseTransferEvent(tx, config.walletAddress)
      if (event) {
        config.onTransfer(event)
      }
    } catch (err) {
      if (!stopped) {
        config.onError(err instanceof Error ? err : new Error(String(err)))
      }
    }
  }

  return {
    start: async () => {
      stopped = false
      subscriptionId = (connection as any).onLogs(
        { mentions: [USDT_MINT] } as any,
        callback,
        'confirmed',
      )
    },

    stop: () => {
      stopped = true
      if (subscriptionId !== null) {
        (connection as any).removeOnLogsListener(subscriptionId).catch(() => {})
        subscriptionId = null
      }
    },
  }
}
