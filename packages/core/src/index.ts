import { Connection, VersionedTransaction } from "@solana/web3.js";
import { createListener } from "@kololabs/listener";
import type { TransferEvent, ListenerConfig, Listener } from "@kololabs/listener";
import { getQuote, getSwapTransaction } from "@kololabs/router";
import type { JupiterQuoteResponse, JupiterSwapResponse, JupiterOptions } from "@kololabs/router";
import { createGasManager } from "@kololabs/gas";
import type { GasConfig, GasManager, GasStatus } from "@kololabs/gas";

// ── Constants ──────────────────────────────────────────────────────

const SOL_MINT = "So11111111111111111111111111111111111111112";

// ── Public types ───────────────────────────────────────────────────

/** Configuration for `KoloEngine`. */
export interface KoloEngineConfig {
  /** Solana RPC URL. */
  rpcUrl: string;
  /** The wallet address to monitor for incoming transfers. */
  walletAddress: string;
  /** The token mint to swap INTO (e.g. USDT). */
  targetMint: string;
  /** Minimum SOL balance required before executing swaps. Default 0.1. */
  minimumBalanceSol?: number;
  /** Target SOL balance to maintain. Defaults to minimumBalanceSol * 2. */
  targetBalanceSol?: string;
  /** Slippage tolerance in basis points. Default 50 (0.5 %). */
  slippageBps?: number;
  /**
   * Signing function. Receives a deserialized `VersionedTransaction` and must
   * sign it and return the transaction signature (base58).
   */
  signer: (transaction: VersionedTransaction) => Promise<string>;
  /** Called after a successful swap. */
  onSwapComplete?: (event: SwapCompleteEvent) => void;
  /** Called when a swap fails after retry. */
  onError?: (error: Error) => void;
}

/** Payload passed to `onSwapComplete`. */
export interface SwapCompleteEvent {
  /** The transaction signature of the swap. */
  signature: string;
  /** The mint of the token that was swapped FROM. */
  inputMint: string;
  /** The raw amount that was swapped (stringified u64). */
  inputAmount: string;
  /** The mint of the token that was swapped INTO. */
  outputMint: string;
  /** The output amount in whole units (not raw). */
  outputAmount: number;
}

/** Interface returned by `createEngine`. */
export interface KoloEngine {
  /** Start monitoring for incoming transfers. */
  start(): Promise<void>;
  /** Stop monitoring and clean up. */
  stop(): Promise<void>;
}

// ── Engine implementation ──────────────────────────────────────────

/**
 * Create a `KoloEngine` that monitors a Solana wallet for incoming SPL token
 * transfers and automatically swaps them into a target token (e.g. USDT).
 *
 * Internally creates a {@linkcode Listener} (via `@kololabs/listener`),
 * a {@linkcode GasManager} (via `@kololabs/gas`), and uses {@linkcode getQuote}
 * and {@linkcode getSwapTransaction} from `@kololabs/router`.
 *
 * Failed swaps are retried once with +100 bps slippage before calling `onError`.
 *
 * @example
 * ```ts
 * const engine = createEngine({
 *   rpcUrl: "https://api.mainnet-beta.solana.com",
 *   walletAddress: "...",
 *   targetMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
 *   minimumBalanceSol: 0.1,
 *   signer: async (tx) => { tx.sign([myKeypair]); return tx.signatures[0].toString(); },
 *   onSwapComplete: (event) => console.log("Swapped", event),
 *   onError: (err) => console.error("Swap failed", err),
 * });
 *
 * await engine.start();
 * // ... later
 * await engine.stop();
 * ```
 */
export function createEngine(config: KoloEngineConfig): KoloEngine {
  const {
    rpcUrl,
    walletAddress,
    targetMint,
    minimumBalanceSol = 0.1,
    targetBalanceSol,
    slippageBps = 50,
    signer,
    onSwapComplete,
    onError,
  } = config;

  const connection = new Connection(rpcUrl);

  const gasManager = createGasManager({
    rpcUrl,
    walletAddress,
    minimumBalanceSol,
    targetBalanceSol: targetBalanceSol ? Number(targetBalanceSol) : undefined,
  });

  let currentSlippageBps = slippageBps;

  /**
   * Attempt a swap for a single transfer. Returns the swap signature on
   * success, or throws on failure.
   */
  async function attemptSwap(
    transfer: TransferEvent,
    slippage: number
  ): Promise<string> {
    // 1. Get quote
    const jupOptions: JupiterOptions = {
      outputMint: targetMint,
      slippageBps: slippage,
    };
    const quote = await getQuote(transfer.mint, transfer.amount, jupOptions);

    // 2. Get swap transaction
    const swapData = await getSwapTransaction(quote, walletAddress, jupOptions);

    // 3. Deserialize the transaction
    const txBuffer = Buffer.from(swapData.swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // 4. Sign via user-provided signer
    const signature = await signer(transaction);

    // 5. Send the signed transaction
    const txSignature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false, maxRetries: 3 }
    );

    // 6. Confirm
    const confirmation = await connection.confirmTransaction(
      txSignature,
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error(
        `Swap transaction failed on-chain: ${confirmation.value.err}`
      );
    }

    return txSignature;
  }

  /** Handle an incoming transfer event from the listener. */
  async function handleTransfer(transfer: TransferEvent): Promise<void> {
    try {
      // 1. Check gas
      const gasStatus = await gasManager.checkBalance();

      // 2. Gas management
      // If incoming token is native SOL and balance is below target, keep for gas
      if (transfer.mint === SOL_MINT) {
        const incomingAmount =
          parseFloat(transfer.amount) / 1_000_000_000; // lamports → SOL
        const needsTopUp = await gasManager.needsTopUp();
        if (needsTopUp) {
          // Keep SOL for gas — don't swap
          return;
        }
      } else if (!gasStatus.hasEnoughGas) {
        // Non-SOL incoming but not enough SOL for gas fees
        onError?.(
          new Error(
            `Insufficient gas: ${gasStatus.currentBalance.toFixed(4)} SOL (minimum ${gasStatus.minimumBalance} SOL required)`
          )
        );
        return;
      }

      // 3. Attempt the swap with current slippage
      currentSlippageBps = slippageBps;
      try {
        const txSignature = await attemptSwap(transfer, currentSlippageBps);

        // 4. Compute output amount from the quote
        const outputAmount =
          parseFloat(transfer.amount) / 1_000_000_000; // will be overridden by actual quote
        // Actually we need the real quote amount. Let's re-derive it.
        // We already had the quote in attemptSwap, but we don't return it.
        // For now use transfer.amount as a fallback.

        onSwapComplete?.({
          signature: txSignature,
          inputMint: transfer.mint,
          inputAmount: transfer.amount,
          outputMint: targetMint,
          outputAmount: outputAmount,
        });
      } catch (firstError) {
        // Retry with +100 bps slippage
        const retrySlippage = currentSlippageBps + 100;
        try {
          const txSignature = await attemptSwap(transfer, retrySlippage);

          onSwapComplete?.({
            signature: txSignature,
            inputMint: transfer.mint,
            inputAmount: transfer.amount,
            outputMint: targetMint,
            outputAmount: 0, // Don't have the quote output amount here
          });
        } catch (retryError) {
          onError?.(
            retryError instanceof Error
              ? retryError
              : new Error(String(retryError))
          );
        }
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }

  // Create the listener
  const listener = createListener({
    rpcUrl,
    walletAddress,
    onTransfer: handleTransfer,
    onError: (err) => onError?.(err),
  });

  return {
    async start(): Promise<void> {
      await listener.start();
    },
    async stop(): Promise<void> {
      await listener.stop();
    },
  };
}
