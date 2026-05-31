/** An SPL token transfer event detected via WebSocket subscription. */
interface TransferEvent {
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
interface ListenerConfig {
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
interface Listener {
    /** Subscribe to logs for the configured wallet address. */
    start: () => Promise<void>;
    /** Unsubscribe and clean up the WebSocket connection. Returns a promise that
     * resolves when the subscription has been removed. */
    stop: () => Promise<void>;
}
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
declare function createListener(config: ListenerConfig): Listener;

export { type Listener, type ListenerConfig, type TransferEvent, createListener };
