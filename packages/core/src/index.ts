import { CHAINS } from './config';

export {
  CHAIN_IDS,
  DEFAULT_CHAIN,
  getChainConfig,
  getChainIdFromString,
  isValidChainAddress,
} from './config';
export { CHAINS } from './config';
export type { ChainId, ChainConfig } from './config';

export type {
  Wallet,
  Transaction,
  Payment,
  HeliusWebhookPayload,
  JupiterQuoteResponse,
  JupiterSwapResponse,
  Balance,
} from './types';

export {
  encryptPrivateKey,
  encryptPrivateKeyServerOnly,
  decryptPrivateKey,
  decryptPrivateKeyServerOnly,
} from './encryption';

export {
  getSolBalance,
  getTokenBalance,
  generateWallet,
  getKeypairFromSecretKeyHex,
  signAndSendTransaction,
  getKeypairFromPrivateKey,
  shortenAddress,
  formatNative,
  formatSol,
  formatUsd,
  isValidSolanaAddress,
  isValidEvmAddress,
  getExplorerUrl,
} from './solana';

// Solana convenience constants
// These use the CHAINS config object imported locally above
export const USDT_MINT = CHAINS.solana.usdtMint;
export const JUP_API_BASE = CHAINS.solana.swapApiBase;
export const MIN_GAS_SOL = CHAINS.solana.gasConstants.minNative;
export const TARGET_GAS_SOL = CHAINS.solana.gasConstants.targetNative;
export const SOL_MINT = CHAINS.solana.nativeMint;
