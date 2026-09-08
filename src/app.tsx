import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
import { BudgetProvider, useBudget } from "./budget-context";
import { HelpOverlay } from "./components/help-overlay";
import { StatusBar } from "./components/status-bar";
import type { Config } from "./config";
import { useTerminalSize } from "./hooks";
import { AccountsScreen } from "./screens/accounts";
import { AddTransactionScreen } from "./screens/add-transaction";
import { TransactionsScreen } from "./screens/transactions";

type Screen =
  | { name: "accounts" }
  | { name: "transactions"; accountId: string }
  | { name: "add"; accountId: string };

const HINTS: Record<Screen["name"], string> = {
  accounts: "↑↓ move · Enter open · a add · s sync · ? help · q quit",
  transactions: "↑↓ move · c cleared · a add · Esc back · s sync · ? help",
  add: "Tab next · Enter accept · Ctrl+S save · Esc cancel",
};

export function App({ config }: { config: Config }) {
  const { exit } = useApp();
  return (
    <BudgetProvider config={config} onFatal={exit}>
      <Shell config={config} />
    </BudgetProvider>
  );
}

function Shell({ config }: { config: Config }) {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const budget = useBudget();
  const [screen, setScreen] = useState<Screen>({ name: "accounts" });
  const [showHelp, setShowHelp] = useState(false);

  const inForm = screen.name === "add";
  useInput(
    (input) => {
      if (showHelp) setShowHelp(false);
      else if (input === "q") exit();
      else if (input === "s") void budget.syncNow();
      else if (input === "?") setShowHelp(true);
    },
    { isActive: !inForm },
  );

  // Header and status bar take one line each; screens window the rest.
  const bodyHeight = rows - 2;
  const screensActive = budget.ready && !showHelp;
  const accountName = (id: string) =>
    budget.accounts.find((a) => a.id === id)?.name ?? "";

  let breadcrumb = "Accounts";
  let body;
  if (!budget.ready) {
    body = (
      <Box paddingX={1}>
        <Text dimColor>Connecting to {config.serverURL} …</Text>
      </Box>
    );
  } else if (showHelp) {
    body = <HelpOverlay />;
  } else if (screen.name === "accounts") {
    body = (
      <AccountsScreen
        width={columns}
        height={bodyHeight}
        isActive={screensActive}
        onOpen={(accountId) => setScreen({ name: "transactions", accountId })}
        onAdd={(accountId) => setScreen({ name: "add", accountId })}
      />
    );
  } else if (screen.name === "transactions") {
    breadcrumb = `Accounts › ${accountName(screen.accountId)}`;
    const accountId = screen.accountId;
    body = (
      <TransactionsScreen
        accountId={accountId}
        width={columns}
        height={bodyHeight}
        isActive={screensActive}
        onBack={() => setScreen({ name: "accounts" })}
        onAdd={() => setScreen({ name: "add", accountId })}
      />
    );
  } else {
    breadcrumb = `Accounts › ${accountName(screen.accountId)} › New transaction`;
    const accountId = screen.accountId;
    body = (
      <AddTransactionScreen
        accountId={accountId}
        isActive={screensActive}
        onDone={() => setScreen({ name: "transactions", accountId })}
        onCancel={() => setScreen({ name: "transactions", accountId })}
      />
    );
  }

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box paddingX={1}>
        <Text bold color="magenta">
          actual-tui
        </Text>
        <Text dimColor> · </Text>
        <Text>{breadcrumb}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {body}
      </Box>
      <StatusBar hints={HINTS[screen.name]} />
    </Box>
  );
}
