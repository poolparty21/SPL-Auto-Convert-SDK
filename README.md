# SPL Auto-Convert SDK

[![npm version](https://img.shields.io/npm/v/@kololabs/core)](https://www.npmjs.com/package/@kololabs/core)
[![License: MIT](https://img.shields.io/github/license/poolparty21/SPL-Auto-Convert-SDK)](LICENSE)
[![CI](https://github.com/poolparty21/SPL-Auto-Convert-SDK/actions/workflows/ci.yml/badge.svg?branch=fresh-sdk)](https://github.com/poolparty21/SPL-Auto-Convert-SDK/actions/workflows/ci.yml?query=branch%3Afresh-sdk)
[![Solana](https://img.shields.io/badge/Solana-3.0.0-9945FF?logo=solana)](https://solana.com)

Automatic SOL to USDT conversion on Solana. Built for [savingswallet.online](https://savingswallet.online).

## Packages

| Package | Description |
|---------|-------------|
| [`@kololabs/core`](packages/core) | KoloEngine orchestrator |
| [`@kololabs/gas`](packages/gas) | SOL balance management |
| [`@kololabs/router`](packages/router) | Jupiter DEX swap routing |
| [`@kololabs/listener`](packages/listener) | Helius WebSocket transfer monitor |

## Usage

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT — Copyright (c) 2026 poolparty21
