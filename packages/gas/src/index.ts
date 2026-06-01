import { Connection, PublicKey } from '@solana/web3.js'

export interface GasManagerConfig {
  rpcUrl: string
  walletAddress: string
  minimumBalanceSol: number
}

export interface BalanceResult {
  currentBalance: number
  hasEnoughGas: boolean
  deficit: number
}

export interface GasManager {
  checkBalance: () => Promise<BalanceResult>
  needsTopUp: () => Promise<boolean>
}

/**
 * Create a SOL balance manager that checks whether the monitored wallet
 * has enough SOL to cover transaction fees.
 */
export function createGasManager(config: GasManagerConfig): GasManager {
  const connection = new Connection(config.rpcUrl)
  const walletPubkey = new PublicKey(config.walletAddress)

  const checkBalance = async (): Promise<BalanceResult> => {
    const lamports = await connection.getBalance(walletPubkey)
    const currentBalance = lamports / 1e9 // Convert lamports to SOL
    const deficit = config.minimumBalanceSol - currentBalance

    return {
      currentBalance,
      hasEnoughGas: currentBalance >= config.minimumBalanceSol,
      deficit: deficit > 0 ? deficit : 0,
    }
  }

  return {
    checkBalance,

    needsTopUp: async (): Promise<boolean> => {
      const { hasEnoughGas } = await checkBalance()
      return !hasEnoughGas
    },
  }
}
