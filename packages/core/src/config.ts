export type ChainId = 'solana' | 'base' | 'avalanche';

export const CHAIN_IDS: ChainId[] = ['solana', 'base', 'avalanche'];

export interface ChainConfig {
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

export const CHAINS: Record<ChainId, ChainConfig> = {
  solana: {
    id: 'solana',
    name: 'Solana',
    label: 'Solana',
    usdtMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    nativeCurrency: 'SOL',
    nativeMint: 'So11111111111111111111111111111111111111112',
    explorer: 'https://solscan.io',
    explorerTxPath: '/tx',
    explorerAccountPath: '/account',
    rpcUrlEnvVar: 'SOLANA_RPC_URL',
    swapApiBase: 'https://quote-api.jup.ag/v6',
    routerAddress: '',
    wrappedNative: '',
    gasConstants: {
      minNative: 0.1,
      targetNative: 0.2,
    },
    color: '#9945FF',
    gradientFrom: '#9945FF',
    gradientTo: '#00FFA3',
    gradientBg: 'from-purple-500/10 to-cyan-500/5',
  },
  base: {
    id: 'base',
    name: 'Base',
    label: 'Base',
    usdtMint: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    nativeCurrency: 'ETH',
    nativeMint: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    explorer: 'https://basescan.org',
    explorerTxPath: '/tx',
    explorerAccountPath: '/address',
    rpcUrlEnvVar: 'BASE_RPC_URL',
    swapApiBase: 'https://base.api.0x.org/',
    routerAddress: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    wrappedNative: '0x4200000000000000000000000000000000000006',
    gasConstants: {
      minNative: 0.0005,
      targetNative: 0.002,
    },
    color: '#0052FF',
    gradientFrom: '#0052FF',
    gradientTo: '#0052FF',
    gradientBg: 'from-blue-500/10 to-blue-500/5',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    label: 'Avalanche',
    usdtMint: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    nativeCurrency: 'AVAX',
    nativeMint: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    explorer: 'https://snowtrace.io',
    explorerTxPath: '/tx',
    explorerAccountPath: '/address',
    rpcUrlEnvVar: 'AVALANCHE_RPC_URL',
    swapApiBase: 'https://avalanche.api.0x.org/',
    routerAddress: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    wrappedNative: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    gasConstants: {
      minNative: 0.005,
      targetNative: 0.02,
    },
    color: '#E84142',
    gradientFrom: '#E84142',
    gradientTo: '#E84142',
    gradientBg: 'from-red-500/10 to-red-500/5',
  },
};

export const DEFAULT_CHAIN: ChainId = 'solana';

export function getChainConfig(chain: ChainId): ChainConfig {
  return CHAINS[chain];
}

export function getChainIdFromString(s: string): ChainId {
  if (s === 'base' || s === 'avalanche' || s === 'solana') return s;
  return DEFAULT_CHAIN;
}

export function isValidChainAddress(address: string, chain: ChainId): boolean {
  switch (chain) {
    case 'solana':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case 'base':
    case 'avalanche':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
