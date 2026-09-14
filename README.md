# actual-tui

A terminal UI for [Actual Budget](https://actualbudget.org). It talks to your own sync server, shows accounts and transactions, lets you add, edit, and clear transactions, and keeps everything in sync with the other devices using this budget.

At the current time its point is to show accounts and transactions, not yet your budget.

Sync is handled thorugh Actual's own engine, the tool embeds `@actual-app/api`, the same implementation the official clients run and in the same way those work, everything is written to a local copy of the budget and then synced to the server.

Full disclosure: This tool was primarily implemented with the help of agentic coding tools. I'm sorry if that's a problem for you, but this exists to scratch a personal itch and wouldn't exist otherwise. This readme is of course written by a human, slop docs aren't fun to read.

## Installation

The binary is called `actual`. With nix, run it straight from the flake or add `packages.default` to your own configuration:

```sh
nix run github:kiliankoe/actual-tui
```

Without nix, build it and link the binary into your PATH:

```sh
pnpm install
pnpm build
pnpm link --global
```

The tool embeds Actual's engine, so the bundled `@actual-app/api` version has to match the version of your sync server. The TUI compares both at startup. A mismatch that still loads is shown in the status line, one that stops the budget from loading is reported with both versions on exit. When in doubt, upgrade actual-tui together with the server.

## Usage

The status line at the bottom shows available keybindings, press `?` to show a detailed listing.

While filtering with `/`, `Enter` keeps the filter and returns to the list. `Esc` clears the filter and `/` refocuses it. While a filter is active, the account balance shows the sum of the filter results.

In the transaction form, `Tab` and `Shift+Tab` move between fields, arrow keys move through payee and category suggestions, `Enter` accepts a field and saves on the last one. `Ctrl+S` saves at any point and `Esc` cancels.
Typing a payee that does not yet exist creates it. A category must already exist.

## Setup & Development

Requires Node 22 or newer and pnpm. The nix flake provides a dev shell with those.

Create `~/.config/actual-tui/config.json`:

```json
{
  "serverURL": "https://url-to-your-budget.tld",
  "syncId": "Sync ID from Settings > Advanced settings"
}
```

Then get your server password and start a dev build via:

```sh
export ACTUAL_PASSWORD=...
pnpm dev
```

Please make sure `pnpm test` and `pnpm typecheck` pass. `pnpm build` bundles `src` into `dist/index.js`, which is what the `actual` binary and the nix package both run.

To try the app without touching a real budget, run a throwaway sync server and seed it with a demo budget:

```sh
# in another terminal; the nixpkgs package works too: nix run nixpkgs#actual-server
ACTUAL_PORT=5007 ACTUAL_DATA_DIR=/tmp/actual-test-server npx --yes @actual-app/sync-server

ACTUAL_SERVER_URL=http://127.0.0.1:5007 ACTUAL_PASSWORD=test pnpm tsx scripts/seed-test-budget.ts
```

The seed script bootstraps the server with the given password, creates a budget with a few accounts and transactions, and prints the sync ID plus a ready-made command line for starting the TUI against it.

`scripts/inspect-budget.ts` reads the budget through a second, independent client (give it its own `ACTUAL_DATA_DIR`) and prints accounts and this month's transactions. This can be used to confirm that a change made in the TUI really made it all the way to the server.

### Configuration

All settings can live in either the config file or be passed as env vars, the latter win. `XDG_CONFIG_HOME` and `XDG_DATA_HOME` are honored.

Existing options:

- `serverURL`/`ACTUAL_SERVER_URL` - Required
- `password`/`ACTUAL_PASSWORD` - Required
- `syncId`/`ACTUAL_SYNC_ID` - Required
- `dataDir`/`ACTUAL_DATA_DIR` - Local budget cache, defaults to `~/.local/share/actual-tui`
- `encryptionPassword`/`ACTUAL_ENCRYPTION_PASSWORD` - only necessary if encryption is enabled

## Features that don't exist yet

- Budget overview
- Reports
- Split Entry
- Adding transfers
- Rules
