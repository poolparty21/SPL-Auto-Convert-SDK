# SPL Auto-Convert SDK  – [@kololabs](https://github.com/kololabs)

<p align="center">
  <img src="https://img.shields.io/npm/v/@kololabs/core?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/npm/l/@kololabs/core?style=flat-square" alt="MIT license" />
  <img src="https://img.shields.io/github/actions/workflow/status/kololabs/SPL-Auto-Convert-SDK/ci.yml?branch=main&style=flat-square&label=build" alt="build status" />
</p>

**Auto-convert incoming SPL tokens to USDT on Solana.**

A modular TypeScript monorepo that powers [savingswallet.online](https://savingswallet.online) — a non-custodial platform that automatically swaps any incoming SPL token into USDT, so you never have to worry about dust or manual trades.

---

## Install

```bash
npm install @kololabs/core @kololabs/listener @kololabs/router @kololabs/gas
```

Or with pnpm:

```bash
pnpm add @kololabs/core @kololabs/listener @kololabs/router @kololabs/gas
```

---

## Quick Start

```typescript
import { KoloEngine } from '@kololabs/core';
import { HeliusListener } from '@kololabs/listener';
import { JupiterRouter } from '@kololabs/router';

const engine = new KoloEngine({
  rpcUrl: process.env.SOLANA_RPC_URL,
  privateKey: process.env.WALLET_PRIVATE_KEY,
  listener: new HeliusListener({ webhookId: process.env.HELIUS_WEBHOOK_ID }),
  router: new JupiterRouter(),
});

// Automatically converts incoming SPL tokens to USDT
engine.on('deposit', async (event) => {
  console.log(`Received ${event.amount} of ${event.mint}`);
  await engine.autoConvert(event);
});

engine.start();
```

*(Note: The `KoloEngine` class is currently in active development — the example above illustrates the intended public API.)*

---

## Packages

| Package | Description |
|---|---|
| [`@kololabs/core`](./packages/core) | Shared types, chain configuration (Solana / Base / Avalanche), key encryption (AES-256-GCM), and Solana RPC helpers |
| [`@kololabs/listener`](./packages/listener) | Helius webhook management — subscribe to incoming token transfers and trigger auto-conversion |
| [`@kololabs/router`](./packages/router) | Jupiter swap integration — quote fetching, swap transaction building, and token price estimation |
| [`@kololabs/gas`](./packages/gas) | Native gas estimation and management for automated swap operations |

---

## Live Demo

See the SDK in action at **[savingswallet.online](https://savingswallet.online)** — a non-custodial wallet that auto-converts all incoming tokens to USDT.

---

## Acknowledgements

This project was built with support from the **Solana Foundation**, as part of the Solana grant program focused on improving the DeFi user experience on Solana.

---

## License

MIT © 2026 [@kololabs](https://github.com/kololabs)
