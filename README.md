# SPL Auto-Convert SDK

A modular monorepo for building SPL token auto-conversion pipelines on Solana.

## Packages

| Package | Description |
|---------|-------------|
| [`@kolo/core`](./packages/core) | Core utilities and shared types |
| [`@kolo/gas`](./packages/gas) | Gas estimation and fee management |
| [`@kolo/listener`](./packages/listener) | On-chain event listening |
| [`@kolo/router`](./packages/router) | Payment routing logic |

## Prerequisites

- Node.js >= 18
- pnpm (install via `npm install -g pnpm` or `corepack enable pnpm`)

## Setup

```bash
pnpm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages with tsup |
| `pnpm test` | Run all package tests with vitest |
| `pnpm lint` | Type-check all packages |
| `pnpm changeset` | Create a new changeset |
| `pnpm version-packages` | Apply changeset version bumps |
| `pnpm release` | Build and publish changed packages |

## Publishing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

1. Run `pnpm changeset` to describe your changes
2. Commit the generated `.md` file
3. On PR merge, run `pnpm version-packages` to bump versions
4. Run `pnpm release` to publish to npm

## License

MIT
