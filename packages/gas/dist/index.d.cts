/**
 * Minimum native balance required to process swaps (in SOL).
 */
declare const MIN_GAS_SOL: number;
/**
 * Target native balance to maintain (in SOL). Incoming SOL is kept
 * for gas until this threshold is met, then excess is swapped.
 */
declare const TARGET_GAS_SOL: number;
/**
 * Check if a wallet has enough SOL for gas fees.
 * Returns an object with the current balance and whether it's sufficient.
 */
declare function checkGasForSwap(publicKey: string): Promise<{
    sufficient: boolean;
    balance: number;
    minRequired: number;
    target: number;
}>;
/**
 * Check if the wallet's SOL balance is below the target threshold,
 * meaning incoming SOL should be kept for gas rather than swapped.
 */
declare function shouldKeepSolForGas(publicKey: string): Promise<{
    keep: boolean;
    balance: number;
    target: number;
}>;
/**
 * Estimate how much additional SOL is needed to reach the target balance.
 */
declare function gasDeficit(publicKey: string): Promise<{
    deficit: number;
    balance: number;
    target: number;
}>;

export { MIN_GAS_SOL, TARGET_GAS_SOL, checkGasForSwap, gasDeficit, shouldKeepSolForGas };
