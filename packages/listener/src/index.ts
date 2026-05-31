import { Connection, PublicKey } from "@solana/web3.js";

// ── Types ──────────────────────────────────────────────────────────

/** An SPL token transfer event detected via WebSocket subscription. */
export interface TransferEvent {
  /** Transaction signature (base58). */
  signature: string;
  /** Slot in which the transaction was confirmed. */
  slot: number;
  /** Token mint address. */
  mint: string;
  /** Raw transfer amount (stringified u64, includes decimals). */
  amount: string;
  /** Sender wallet address. */
  sender: string;
  /** Receiver wallet address. */
  receiver: string;
}

/** Configuration for `createListener`. */
export interface ListenerConfig {
  /** Solana RPC URL (HTTP or HTTPS). The WebSocket URL is derived automatically. */
  rpcUrl: string;
  /** The wallet address to monitor for incoming/outgoing token transfers. */
  walletAddress: string;
  /** Called whenever a relevant transfer is detected. */
  onTransfer: (event: TransferEvent) => void;
  /** Called when an error occurs during subscription or parsing. */
  onError: (error: Error) => void;
}

/** The started / stopped listener handle returned by `createListener`. */
export interface Listener {
  /** Subscribe to logs for the configured wallet address. */
  start: () => Promise<void>;
  /** Unsubscribe and clean up the WebSocket connection. Returns a promise that
   * resolves when the subscription has been removed. */
  stop: () => Promise<void>;
}

// ── Constants ──────────────────────────────────────────────────────

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

// ── Helpers ────────────────────────────────────────────────────────

function validateConfig(config: ListenerConfig): void {
  if (!config.rpcUrl) throw new Error("rpcUrl is required");
  if (!config.walletAddress) throw new Error("walletAddress is required");
  if (typeof config.onTransfer !== "function")
    throw new Error("onTransfer callback is required");
  if (typeof config.onError !== "function")
    throw new Error("onError callback is required");
}

/**
 * Quick check whether a set of log lines looks like they involve
 * an SPL Token transfer.  The token program ID and the "Transfer"
 * keyword typically appear on *different* log lines, so we check
 * the concatenated text rather than using `.some()` on each line.
 */
function isTokenTransferLog(logs: string[]): boolean {
  const text = logs.join(" ");
  return text.includes(TOKEN_PROGRAM_ID) && /\bTransfer\b/i.test(text);
}

// ── Implementation ─────────────────────────────────────────────────

/**
 * Create a WebSocket-based listener that monitors SPL token transfers
 * to/from a given wallet address on Solana.
 *
 * Internally uses {@link Connection.onLogs} to subscribe to transaction
 * logs mentioning the wallet. When a log contains SPL Token program
 * activity, it fetches the parsed transaction and extracts the token
 * mint, amount, sender, and receiver from the pre/post token balance
 * changes.
 *
 * **Note:** Some RPC providers may omit the `owner` field from
 * `TokenBalance` entries, which can prevent detecting which wallet
 * a token account belongs to. Helius RPC endpoints include this field.
 *
 * **Known limitation:** The `sender` and `receiver` fields are derived
 * from the token account owner on the same `accountIndex` in the
 * transaction's pre/post balance arrays. For cross-wallet transfers,
 * the counterparty address is the owner of a *different* token account
 * index, so it may resolve to `"unknown"` in some edge cases.
 *
 * @example
 * ```ts
 * const listener = createListener({
 *   rpcUrl: "https://api.mainnet-beta.solana.com",
 *   walletAddress: "Axy...8xZ",
 *   onTransfer: (event) => console.log("Transfer:", event),
 *   onError: (err) => console.error("Listener error:", err),
 * });
 *
 * await listener.start();
 * // ... later
 * await listener.stop();
 * ```
 */
export function createListener(config: ListenerConfig): Listener {
  validateConfig(config);

  const connection = new Connection(config.rpcUrl);
  const walletPk = new PublicKey(config.walletAddress);
  const walletStr = config.walletAddress;

  let subId: number | null = null;

  async function handleLogs(
    logs: { signature: string; err: unknown; logs: string[] },
    slot: number
  ): Promise<void> {
    // Ignore errored transactions
    if (logs.err) return;

    if (!isTokenTransferLog(logs.logs)) return;

    try {
      const tx = await connection.getParsedTransaction(logs.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta) return;

      const pre = tx.meta.preTokenBalances ?? [];
      const post = tx.meta.postTokenBalances ?? [];

      // Compare pre / post balances to find tokens that changed
      for (const postBalance of post) {
        const preBalance = pre.find(
          (p) => p.accountIndex === postBalance.accountIndex
        );
        if (!preBalance) continue;

        const preAmt = BigInt(preBalance.uiTokenAmount.amount);
        const postAmt = BigInt(postBalance.uiTokenAmount.amount);

        if (postAmt === preAmt) continue;

        const owner = postBalance.owner ?? preBalance.owner ?? "";

        if (postAmt > preAmt) {
          // Token received — check if it involves our monitored wallet
          if (owner === walletStr) {
            config.onTransfer({
              signature: logs.signature,
              slot,
              mint: postBalance.mint,
              amount: (postAmt - preAmt).toString(),
              sender: preBalance.owner ?? "unknown",
              receiver: walletStr,
            });
          }
        } else {
          // Token sent
          if (owner === walletStr) {
            config.onTransfer({
              signature: logs.signature,
              slot,
              mint: preBalance.mint,
              amount: (preAmt - postAmt).toString(),
              sender: walletStr,
              receiver: postBalance.owner ?? "unknown",
            });
          }
        }
      }
    } catch (err) {
      config.onError(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }

  return {
    async start(): Promise<void> {
      subId = await connection.onLogs(
        walletPk,
        (logs, context) => {
          // Fire handleLogs asynchronously — catch any synchronous
          // or async errors and forward them to the consumer
          handleLogs(logs, context.slot).catch(config.onError);
        },
        "confirmed"
      );
    },

    async stop(): Promise<void> {
      if (subId !== null) {
        await connection.removeOnLogsListener(subId);
        subId = null;
      }
    },
  };
}
