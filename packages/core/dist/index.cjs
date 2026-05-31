'use strict';

var crypto = require('crypto');
var web3_js = require('@solana/web3.js');
var ed25519HdKey = require('ed25519-hd-key');
var bip39 = require('bip39');
var bs58 = require('bs58');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var crypto__default = /*#__PURE__*/_interopDefault(crypto);
var bs58__default = /*#__PURE__*/_interopDefault(bs58);

// src/config.ts
var CHAIN_IDS = ["solana", "base", "avalanche"];
var CHAINS = {
  solana: {
    id: "solana",
    name: "Solana",
    label: "Solana",
    usdtMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    nativeCurrency: "SOL",
    nativeMint: "So11111111111111111111111111111111111111112",
    explorer: "https://solscan.io",
    explorerTxPath: "/tx",
    explorerAccountPath: "/account",
    rpcUrlEnvVar: "SOLANA_RPC_URL",
    swapApiBase: "https://quote-api.jup.ag/v6",
    routerAddress: "",
    wrappedNative: "",
    gasConstants: {
      minNative: 0.1,
      targetNative: 0.2
    },
    color: "#9945FF",
    gradientFrom: "#9945FF",
    gradientTo: "#00FFA3",
    gradientBg: "from-purple-500/10 to-cyan-500/5"
  },
  base: {
    id: "base",
    name: "Base",
    label: "Base",
    usdtMint: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    nativeCurrency: "ETH",
    nativeMint: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    explorer: "https://basescan.org",
    explorerTxPath: "/tx",
    explorerAccountPath: "/address",
    rpcUrlEnvVar: "BASE_RPC_URL",
    swapApiBase: "https://base.api.0x.org/",
    routerAddress: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    wrappedNative: "0x4200000000000000000000000000000000000006",
    gasConstants: {
      minNative: 5e-4,
      targetNative: 2e-3
    },
    color: "#0052FF",
    gradientFrom: "#0052FF",
    gradientTo: "#0052FF",
    gradientBg: "from-blue-500/10 to-blue-500/5"
  },
  avalanche: {
    id: "avalanche",
    name: "Avalanche",
    label: "Avalanche",
    usdtMint: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
    nativeCurrency: "AVAX",
    nativeMint: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    explorer: "https://snowtrace.io",
    explorerTxPath: "/tx",
    explorerAccountPath: "/address",
    rpcUrlEnvVar: "AVALANCHE_RPC_URL",
    swapApiBase: "https://avalanche.api.0x.org/",
    routerAddress: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
    wrappedNative: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    gasConstants: {
      minNative: 5e-3,
      targetNative: 0.02
    },
    color: "#E84142",
    gradientFrom: "#E84142",
    gradientTo: "#E84142",
    gradientBg: "from-red-500/10 to-red-500/5"
  }
};
var DEFAULT_CHAIN = "solana";
function getChainConfig(chain) {
  return CHAINS[chain];
}
function getChainIdFromString(s) {
  if (s === "base" || s === "avalanche" || s === "solana") return s;
  return DEFAULT_CHAIN;
}
function isValidChainAddress(address, chain) {
  switch (chain) {
    case "solana":
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case "base":
    case "avalanche":
      return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
var ALGORITHM = "aes-256-gcm";
var KEY_LENGTH = 32;
var IV_LENGTH = 16;
var SALT_LENGTH = 32;
function deriveKey(password, serverSecret, salt) {
  return crypto__default.default.pbkdf2Sync(password + serverSecret, salt, 1e5, KEY_LENGTH, "sha512");
}
function deriveServerKey(serverSecret, salt) {
  return crypto__default.default.pbkdf2Sync(serverSecret, salt, 1e5, KEY_LENGTH, "sha512");
}
function encryptPrivateKey(privateKeyHex, userPassword, serverSecret) {
  const salt = crypto__default.default.randomBytes(SALT_LENGTH).toString("hex");
  const key = deriveKey(userPassword, serverSecret, salt);
  const iv = crypto__default.default.randomBytes(IV_LENGTH);
  const cipher = crypto__default.default.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(privateKeyHex, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    encryptedData: encrypted,
    salt,
    iv: iv.toString("hex"),
    authTag
  };
}
function encryptPrivateKeyServerOnly(privateKeyHex, serverSecret) {
  const salt = crypto__default.default.randomBytes(SALT_LENGTH).toString("hex");
  const key = deriveServerKey(serverSecret, salt);
  const iv = crypto__default.default.randomBytes(IV_LENGTH);
  const cipher = crypto__default.default.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(privateKeyHex, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    encryptedData: encrypted,
    salt,
    iv: iv.toString("hex"),
    authTag
  };
}
function decryptPrivateKey(encryptedData, userPassword, serverSecret, salt, iv, authTag) {
  const key = deriveKey(userPassword, serverSecret, salt);
  const decipher = crypto__default.default.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
function decryptPrivateKeyServerOnly(encryptedData, serverSecret, salt, iv, authTag) {
  const key = deriveServerKey(serverSecret, salt);
  const decipher = crypto__default.default.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
var SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";
function getSolConnection(rpcUrl) {
  const url = process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  return new web3_js.Connection(url);
}
async function getSolBalance(publicKey, connection) {
  const conn = connection || getSolConnection();
  const pk = new web3_js.PublicKey(publicKey);
  const balance = await conn.getBalance(pk);
  return balance / web3_js.LAMPORTS_PER_SOL;
}
async function getTokenBalance(publicKey, mintAddress, connection) {
  const conn = connection || getSolConnection();
  const pk = new web3_js.PublicKey(publicKey);
  const mint = new web3_js.PublicKey(mintAddress);
  try {
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pk, {
      mint
    });
    if (tokenAccounts.value.length === 0) return 0;
    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
    return parseFloat(balance.uiAmountString || "0");
  } catch {
    return 0;
  }
}
function generateWallet() {
  const mnemonic = bip39.generateMnemonic(128);
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedKey = ed25519HdKey.derivePath(SOLANA_DERIVATION_PATH, seed.toString("hex")).key;
  const keypair = web3_js.Keypair.fromSeed(derivedKey);
  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    secretKeyHex: Buffer.from(keypair.secretKey).toString("hex"),
    mnemonic
  };
}
function getKeypairFromSecretKeyHex(hex) {
  return web3_js.Keypair.fromSecretKey(Buffer.from(hex, "hex"));
}
async function signAndSendTransaction(transactionHex, secretKeyHex, connection) {
  const conn = connection || getSolConnection();
  getKeypairFromSecretKeyHex(secretKeyHex);
  const tx = Buffer.from(transactionHex, "base64");
  return conn.sendRawTransaction(tx);
}
function getKeypairFromPrivateKey(base58Key) {
  return web3_js.Keypair.fromSecretKey(bs58__default.default.decode(base58Key));
}
function isValidSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
function isValidEvmAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function shortenAddress(address, chars = 4) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
function formatSol(lamports) {
  return (lamports / 1e9).toFixed(4);
}
function formatNative(amount, decimals = 9) {
  return (amount / 10 ** decimals).toFixed(4);
}
function formatUsd(amount) {
  return `$${amount.toFixed(2)}`;
}
function getExplorerUrl(type, hash, explorerBase = "https://solscan.io") {
  const path = type === "tx" ? "/tx" : "/account";
  return `${explorerBase}${path}/${hash}`;
}

// src/index.ts
var USDT_MINT = CHAINS.solana.usdtMint;
var JUP_API_BASE = CHAINS.solana.swapApiBase;
var MIN_GAS_SOL = CHAINS.solana.gasConstants.minNative;
var TARGET_GAS_SOL = CHAINS.solana.gasConstants.targetNative;
var SOL_MINT = CHAINS.solana.nativeMint;

exports.CHAINS = CHAINS;
exports.CHAIN_IDS = CHAIN_IDS;
exports.DEFAULT_CHAIN = DEFAULT_CHAIN;
exports.JUP_API_BASE = JUP_API_BASE;
exports.MIN_GAS_SOL = MIN_GAS_SOL;
exports.SOL_MINT = SOL_MINT;
exports.TARGET_GAS_SOL = TARGET_GAS_SOL;
exports.USDT_MINT = USDT_MINT;
exports.decryptPrivateKey = decryptPrivateKey;
exports.decryptPrivateKeyServerOnly = decryptPrivateKeyServerOnly;
exports.encryptPrivateKey = encryptPrivateKey;
exports.encryptPrivateKeyServerOnly = encryptPrivateKeyServerOnly;
exports.formatNative = formatNative;
exports.formatSol = formatSol;
exports.formatUsd = formatUsd;
exports.generateWallet = generateWallet;
exports.getChainConfig = getChainConfig;
exports.getChainIdFromString = getChainIdFromString;
exports.getExplorerUrl = getExplorerUrl;
exports.getKeypairFromPrivateKey = getKeypairFromPrivateKey;
exports.getKeypairFromSecretKeyHex = getKeypairFromSecretKeyHex;
exports.getSolBalance = getSolBalance;
exports.getTokenBalance = getTokenBalance;
exports.isValidChainAddress = isValidChainAddress;
exports.isValidEvmAddress = isValidEvmAddress;
exports.isValidSolanaAddress = isValidSolanaAddress;
exports.shortenAddress = shortenAddress;
exports.signAndSendTransaction = signAndSendTransaction;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map