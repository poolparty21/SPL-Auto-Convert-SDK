import { Keypair, Connection } from '@solana/web3.js';

type ChainId = 'solana' | 'base' | 'avalanche';
declare const CHAIN_IDS: ChainId[];
interface ChainConfig {
    id: ChainId;
    name: string;
    label: string;
    usdtMint: string;
    nativeCurrency: string;
    nativeMint: string;
    explorer: string;
    explorerTxPath: string;
    explorerAccountPath: string;
    rpcUrlEnvVar: string;
    swapApiBase: string;
    routerAddress: string;
    wrappedNative: string;
    gasConstants: {
        minNative: number;
        targetNative: number;
    };
    color: string;
    gradientFrom: string;
    gradientTo: string;
    gradientBg: string;
}
declare const CHAINS: Record<ChainId, ChainConfig>;
declare const DEFAULT_CHAIN: ChainId;
declare function getChainConfig(chain: ChainId): ChainConfig;
declare function getChainIdFromString(s: string): ChainId;
declare function isValidChainAddress(address: string, chain: ChainId): boolean;

interface Wallet {
    id: string;
    chain: ChainId;
    public_key: string;
    encrypted_private_key: string;
    encryption_salt: string;
    encryption_iv: string;
    encryption_auth_tag: string;
    auto_convert_enabled: boolean;
    cold_wallet_enabled: boolean;
    cold_wallet_address: string | null;
    cold_wallet_threshold_usd: number;
    subscription_active: boolean;
    subscription_expires_at: string | null;
    created_at: string;
    updated_at: string;
}
interface Transaction {
    id: string;
    wallet_id: string;
    chain: ChainId;
    incoming_tx_hash: string;
    incoming_mint: string;
    incoming_symbol: string | null;
    incoming_amount: number;
    incoming_value_usd: number | null;
    action_type: 'swapped' | 'sent_to_cold' | 'failed' | 'skipped_low_gas';
    output_tx_hash: string | null;
    output_amount: number | null;
    output_mint: string | null;
    error_message: string | null;
    created_at: string;
}
interface Payment {
    id: string;
    wallet_id: string;
    chain: ChainId;
    amount: number;
    token: 'SOL' | 'USDT' | 'ETH' | 'AVAX';
    tx_hash: string;
    payment_type: 'subscription' | 'topup';
    status: 'confirmed' | 'pending';
    created_at: string;
}
interface HeliusWebhookPayload {
    webhookID: string;
    accountData: Array<{
        account: string;
        nativeBalanceChange: number;
        tokenBalanceChanges: Array<{
            userAccount: string;
            tokenAccount: string;
            mint: string;
            rawTokenAmount: {
                tokenAmount: string;
                decimals: number;
            };
        }>;
    }>;
    signature: string;
    type: string;
    nativeTransfers: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        amount: number;
    }>;
    tokenTransfers: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        fromTokenAccount: string;
        toTokenAccount: string;
        mint: string;
        rawTokenAmount: {
            tokenAmount: string;
            decimals: number;
        };
    }>;
}
interface JupiterQuoteResponse {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    otherAmountThreshold: string;
    priceImpactPct: string;
    routePlan: Array<{
        swapInfo: {
            label: string;
            inputMint: string;
            outputMint: string;
            inAmount: string;
            outAmount: string;
            feeAmount: string;
            feeMint: string;
        };
    }>;
}
interface JupiterSwapResponse {
    swapTransaction: string;
    lastValidBlockHeight: number;
    prioritizationFeeLamports: number;
    computeUnitLimit: number;
    prioritizationType: {
        computeBudget: {
            microLamports: number;
            estimatedMicroLamports: number;
        };
    };
    dynamicSlippageReport: {
        slippageBps: number;
        otherAmount: number;
        simulatedIncurredSlippageBps: number;
    };
    simulationError: string | null;
}
interface Balance {
    solBalance: number;
    usdtBalance: number;
}

declare function encryptPrivateKey(privateKeyHex: string, userPassword: string, serverSecret: string): {
    encryptedData: string;
    salt: string;
    iv: string;
    authTag: string;
};
declare function encryptPrivateKeyServerOnly(privateKeyHex: string, serverSecret: string): {
    encryptedData: string;
    salt: string;
    iv: string;
    authTag: string;
};
declare function decryptPrivateKey(encryptedData: string, userPassword: string, serverSecret: string, salt: string, iv: string, authTag: string): string;
declare function decryptPrivateKeyServerOnly(encryptedData: string, serverSecret: string, salt: string, iv: string, authTag: string): string;

declare function getSolBalance(publicKey: string, connection?: Connection): Promise<number>;
declare function getTokenBalance(publicKey: string, mintAddress: string, connection?: Connection): Promise<number>;
declare function generateWallet(): {
    keypair: Keypair;
    publicKey: string;
    secretKeyHex: string;
    mnemonic: string;
};
declare function getKeypairFromSecretKeyHex(hex: string): Keypair;
declare function signAndSendTransaction(transactionHex: string, secretKeyHex: string, connection?: Connection): Promise<string>;
declare function getKeypairFromPrivateKey(base58Key: string): Keypair;
declare function isValidSolanaAddress(address: string): boolean;
declare function isValidEvmAddress(address: string): boolean;
declare function shortenAddress(address: string, chars?: number): string;
declare function formatSol(lamports: number): string;
declare function formatNative(amount: number, decimals?: number): string;
declare function formatUsd(amount: number): string;
declare function getExplorerUrl(type: 'tx' | 'address', hash: string, explorerBase?: string): string;

declare const USDT_MINT: string;
declare const JUP_API_BASE: string;
declare const MIN_GAS_SOL: number;
declare const TARGET_GAS_SOL: number;
declare const SOL_MINT: string;

export { type Balance, CHAINS, CHAIN_IDS, type ChainConfig, type ChainId, DEFAULT_CHAIN, type HeliusWebhookPayload, JUP_API_BASE, type JupiterQuoteResponse, type JupiterSwapResponse, MIN_GAS_SOL, type Payment, SOL_MINT, TARGET_GAS_SOL, type Transaction, USDT_MINT, type Wallet, decryptPrivateKey, decryptPrivateKeyServerOnly, encryptPrivateKey, encryptPrivateKeyServerOnly, formatNative, formatSol, formatUsd, generateWallet, getChainConfig, getChainIdFromString, getExplorerUrl, getKeypairFromPrivateKey, getKeypairFromSecretKeyHex, getSolBalance, getTokenBalance, isValidChainAddress, isValidEvmAddress, isValidSolanaAddress, shortenAddress, signAndSendTransaction };
