import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
import type { Transaction } from "./actual";
import { BudgetProvider, useBudget } from "./budget-context";
import { HelpOverlay } from "./components/help-overlay";
import { StatusBar } from "./components/status-bar";
import type { Config } from "./config";
import { useTerminalSize } from "./hooks";
import { AccountsScreen } from "./screens/accounts";
import { TransactionFormScreen } from "./screens/transaction-form";
import { TransactionsScreen } from "./screens/transactions";

type Screen =
  | { name: "accounts" }
  | { name: "transactions"; accountId: string }
  | { name: "form"; accountId: string; transaction?: Transaction };

const HINTS: Record<Screen["name"], string> = {
  accounts: "Enter open · / filter · a add · s sync · ? help · q quit",
  transactions: "/ filter · c cleared · a add · e edit · d delete · ? help",
  form: "Tab next · Enter accept · Ctrl+S save · Esc cancel",
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
  const [exclusiveInput, setExclusiveInput] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [accountFilter, setAccountFilter] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("");
  const [headerInfo, setHeaderInfo] = useState<string | null>(null);

  useInput(
    (input) => {
      if (showHelp) setShowHelp(false);
      else if (input === "q") exit();
      else if (input === "s") void budget.syncNow();
      else if (input === "?") setShowHelp(true);
    },
    { isActive: screen.name !== "form" && !exclusiveInput },
  );

  // Header and status bar take one line each; screens window the rest.
  const bodyHeight = rows - 2;
  const screensActive = budget.ready && !showHelp;
  const accountName = (id: string) =>
    budget.accounts.find((a) => a.id === id)?.name ?? "";
  const openAccount = (accountId: string) => {
    setSelectedTransactionId(null);
    setTransactionFilter("");
    setScreen({ name: "transactions", accountId });
  };

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
        onOpen={openAccount}
        onAdd={(accountId) => setScreen({ name: "form", accountId })}
        filter={accountFilter}
        onFilterChange={setAccountFilter}
        onHeaderInfo={setHeaderInfo}
        onExclusiveInput={setExclusiveInput}
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
        selectedId={selectedTransactionId}
        onSelect={setSelectedTransactionId}
        filter={transactionFilter}
        onFilterChange={setTransactionFilter}
        onHeaderInfo={setHeaderInfo}
        onBack={() => setScreen({ name: "accounts" })}
        onAdd={() => setScreen({ name: "form", accountId })}
        onEdit={(transaction) =>
          setScreen({ name: "form", accountId, transaction })
        }
        onExclusiveInput={setExclusiveInput}
      />
    );
  } else {
    const accountId = screen.accountId;
    breadcrumb = `Accounts › ${accountName(accountId)} › ${
      screen.transaction ? "Edit transaction" : "New transaction"
    }`;
    const back = () => setScreen({ name: "transactions", accountId });
    body = (
      <TransactionFormScreen
        key={screen.transaction?.id ?? "new"}
        accountId={accountId}
        initial={screen.transaction}
        isActive={screensActive}
        onDone={back}
        onCancel={back}
      />
    );
  }

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box paddingX={1} justifyContent="space-between">
        <Text wrap="truncate">
          <Text bold color="magenta">
            actual-tui
          </Text>
          <Text dimColor> · </Text>
          {breadcrumb}
        </Text>
        {headerInfo && <Text color="yellow">{headerInfo}</Text>}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {body}
      </Box>
      <StatusBar hints={HINTS[screen.name]} />
    </Box>
  );
}
