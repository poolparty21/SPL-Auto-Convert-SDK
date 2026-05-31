/**
 * Add a wallet address to the Helius webhook's monitored addresses.
 */
declare function addWalletToWebhook(address: string): Promise<void>;
/**
 * Remove a wallet address from the Helius webhook's monitored addresses.
 */
declare function removeWalletFromWebhook(address: string): Promise<void>;

export { addWalletToWebhook, removeWalletFromWebhook };
