import { VersionedTransaction } from '@solana/web3.js';

/** Configuration for `KoloEngine`. */
interface KoloEngineConfig {
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
interface SwapCompleteEvent {
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
interface KoloEngine {
    /** Start monitoring for incoming transfers. */
    start(): Promise<void>;
    /** Stop monitoring and clean up. */
    stop(): Promise<void>;
}
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
declare function createEngine(config: KoloEngineConfig): KoloEngine;

export { type KoloEngine, type KoloEngineConfig, type SwapCompleteEvent, createEngine };
