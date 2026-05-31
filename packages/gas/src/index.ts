import { CHAINS, getSolBalance } from '@kololabs/core';

/**
 * Minimum native balance required to process swaps (in SOL).
 */
export const MIN_GAS_SOL = CHAINS.solana.gasConstants.minNative;

/**
 * Target native balance to maintain (in SOL). Incoming SOL is kept
 * for gas until this threshold is met, then excess is swapped.
 */
export const TARGET_GAS_SOL = CHAINS.solana.gasConstants.targetNative;

/**
 * Check if a wallet has enough SOL for gas fees.
 * Returns an object with the current balance and whether it's sufficient.
 */
export async function checkGasForSwap(publicKey: string): Promise<{
  sufficient: boolean;
  balance: number;
  minRequired: number;
  target: number;
}> {
  const balance = await getSolBalance(publicKey);
  return {
    sufficient: balance >= MIN_GAS_SOL,
    balance,
    minRequired: MIN_GAS_SOL,
    target: TARGET_GAS_SOL,
  };
}

/**
 * Check if the wallet's SOL balance is below the target threshold,
 * meaning incoming SOL should be kept for gas rather than swapped.
 */
export async function shouldKeepSolForGas(publicKey: string): Promise<{
  keep: boolean;
  balance: number;
  target: number;
}> {
  const balance = await getSolBalance(publicKey);
  return {
    keep: balance < TARGET_GAS_SOL,
    balance,
    target: TARGET_GAS_SOL,
  };
}

/**
 * Estimate how much additional SOL is needed to reach the target balance.
 */
export async function gasDeficit(publicKey: string): Promise<{
  deficit: number;
  balance: number;
  target: number;
}> {
  const balance = await getSolBalance(publicKey);
  return {
    deficit: Math.max(0, TARGET_GAS_SOL - balance),
    balance,
    target: TARGET_GAS_SOL,
  };
}
