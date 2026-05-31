/** Configuration for `createGasManager`. */
interface GasConfig {
    /** Solana RPC URL (HTTP or HTTPS). */
    rpcUrl: string;
    /** The wallet address to monitor for SOL balance. */
    walletAddress: string;
    /** Minimum SOL balance required before allowing swaps (e.g. 0.1). */
    minimumBalanceSol: number;
    /**
     * Target SOL balance to maintain. If the wallet is below this amount
     * and receives incoming SOL, it should be kept for gas rather than swapped.
     * Defaults to `minimumBalanceSol * 2`.
     */
    targetBalanceSol?: number;
}
/** Result of `checkBalance()`. */
interface GasStatus {
    /** Current SOL balance (in whole SOL units). */
    currentBalance: number;
    /** Minimum SOL balance threshold from config. */
    minimumBalance: number;
    /** Whether the current balance meets or exceeds the minimum. */
    hasEnoughGas: boolean;
    /**
     * Deficit in SOL (minimum - current), or 0 if balance meets/exceeds minimum.
     */
    deficit: number;
}
/** Interface returned by `createGasManager`. */
interface GasManager {
    /**
     * Check the current SOL balance of the configured wallet.
     * Returns the balance, minimum threshold, whether there's enough gas,
     * and the deficit.
     */
    checkBalance(): Promise<GasStatus>;
    /**
     * Convenience method that returns `true` if the wallet balance is
     * below the minimum gas threshold (i.e. needs a top-up before swapping).
     */
    needsTopUp(): Promise<boolean>;
}
/**
 * Create a gas manager that monitors SOL balance for a given wallet.
 *
 * @example
 * ```ts
 * const gas = createGasManager({
 *   rpcUrl: "https://api.mainnet-beta.solana.com",
 *   walletAddress: "Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5",
 *   minimumBalanceSol: 0.1,
 *   targetBalanceSol: 0.2,
 * });
 *
 * const status = await gas.checkBalance();
 * console.log(status.hasEnoughGas); // false if below 0.1 SOL
 * ```
 */
declare function createGasManager(config: GasConfig): GasManager;

export { type GasConfig, type GasManager, type GasStatus, createGasManager };
