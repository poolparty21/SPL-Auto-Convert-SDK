import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import bs58 from 'bs58';

const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export function getSolConnection(rpcUrl?: string): Connection {
  const url = rpcUrl || process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(url);
}

export async function getSolBalance(publicKey: string, connection?: Connection): Promise<number> {
  const conn = connection || getSolConnection();
  const pk = new PublicKey(publicKey);
  const balance = await conn.getBalance(pk);
  return balance / LAMPORTS_PER_SOL;
}

export async function getTokenBalance(
  publicKey: string,
  mintAddress: string,
  connection?: Connection,
): Promise<number> {
  const conn = connection || getSolConnection();
  const pk = new PublicKey(publicKey);
  const mint = new PublicKey(mintAddress);

  try {
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pk, {
      mint,
    });

    if (tokenAccounts.value.length === 0) return 0;

    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
    return parseFloat(balance.uiAmountString || '0');
  } catch {
    return 0;
  }
}

export function generateWallet(): {
  keypair: Keypair;
  publicKey: string;
  secretKeyHex: string;
  mnemonic: string;
} {
  const mnemonic = generateMnemonic(128);
  const seed = mnemonicToSeedSync(mnemonic);
  const derivedKey = derivePath(SOLANA_DERIVATION_PATH, seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedKey);

  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    secretKeyHex: Buffer.from(keypair.secretKey).toString('hex'),
    mnemonic,
  };
}

export function getKeypairFromSecretKeyHex(hex: string): Keypair {
  return Keypair.fromSecretKey(Buffer.from(hex, 'hex'));
}

export async function signAndSendTransaction(
  transactionHex: string,
  secretKeyHex: string,
  connection?: Connection,
): Promise<string> {
  const conn = connection || getSolConnection();
  const keypair = getKeypairFromSecretKeyHex(secretKeyHex);
  const tx = Buffer.from(transactionHex, 'base64');
  return conn.sendRawTransaction(tx);
}

export function getKeypairFromPrivateKey(base58Key: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(base58Key));
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4);
}

export function formatNative(amount: number, decimals = 9): string {
  return (amount / 10 ** decimals).toFixed(4);
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function getExplorerUrl(
  type: 'tx' | 'address',
  hash: string,
  explorerBase = 'https://solscan.io',
): string {
  const path = type === 'tx' ? '/tx' : '/account';
  return `${explorerBase}${path}/${hash}`;
}
