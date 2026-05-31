import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// ── Types ──────────────────────────────────────────────────────────

/** Configuration for `createGasManager`. */
export interface GasConfig {
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
export interface GasStatus {
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
export interface GasManager {
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

// ── Factory ────────────────────────────────────────────────────────

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
export function createGasManager(config: GasConfig): GasManager {
  const connection = new Connection(config.rpcUrl);
  const publicKey = new PublicKey(config.walletAddress);
  const minimumBalance = config.minimumBalanceSol;
  const targetBalance = config.targetBalanceSol ?? minimumBalance * 2;

  return {
    async checkBalance(): Promise<GasStatus> {
      const lamports = await connection.getBalance(publicKey);
      const currentBalance = lamports / LAMPORTS_PER_SOL;
      return {
        currentBalance,
        minimumBalance,
        hasEnoughGas: currentBalance >= minimumBalance,
        deficit: Math.max(0, minimumBalance - currentBalance),
      };
    },

    async needsTopUp(): Promise<boolean> {
      const status = await this.checkBalance();
      return !status.hasEnoughGas || status.currentBalance < targetBalance;
    },
  };
}
