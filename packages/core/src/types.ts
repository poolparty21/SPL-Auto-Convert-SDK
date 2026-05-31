import type { ChainId } from './config';

export type { ChainId };

export interface Wallet {
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

export interface Transaction {
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

export interface Payment {
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

export interface HeliusWebhookPayload {
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

export interface JupiterQuoteResponse {
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

export interface JupiterSwapResponse {
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

export interface Balance {
  solBalance: number;
  usdtBalance: number;
}
