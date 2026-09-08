import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { useBudget, type AccountRow } from "../budget-context";
import { formatAmount } from "../format";
import { visibleRange } from "../list";
import { fit } from "../text";

type Row =
  | { kind: "header"; label: string; total: number }
  | { kind: "account"; account: AccountRow };

interface Props {
  width: number;
  height: number;
  isActive: boolean;
  onOpen: (accountId: string) => void;
  onAdd: (accountId: string) => void;
}

function buildRows(accounts: AccountRow[]): Row[] {
  const open = accounts.filter((account) => !account.closed);
  const groups = [
    { label: "On budget", accounts: open.filter((a) => !a.offbudget) },
    { label: "Off budget", accounts: open.filter((a) => a.offbudget) },
  ];
  return groups
    .filter((group) => group.accounts.length > 0)
    .flatMap((group) => [
      {
        kind: "header" as const,
        label: group.label,
        total: group.accounts.reduce((sum, a) => sum + a.balance, 0),
      },
      ...group.accounts.map((account) => ({
        kind: "account" as const,
        account,
      })),
    ]);
}

export function AccountsScreen({
  width,
  height,
  isActive,
  onOpen,
  onAdd,
}: Props) {
  const budget = useBudget();
  const rows = buildRows(budget.accounts);
  const accountIds = rows.flatMap((row) =>
    row.kind === "account" ? [row.account.id] : [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = Math.max(0, accountIds.indexOf(selectedId ?? ""));
  const selected = accountIds[selectedIndex];

  // Functional update so bursts of key repeats each move one step.
  const move = (delta: number) =>
    setSelectedId((current) => {
      const index = Math.max(0, accountIds.indexOf(current ?? ""));
      const next = Math.min(accountIds.length - 1, Math.max(0, index + delta));
      return accountIds[next] ?? null;
    });

  useInput(
    (input, key) => {
      if (key.downArrow) return move(1);
      if (key.upArrow) return move(-1);
      if ((key.return || key.rightArrow) && selected) return onOpen(selected);
      // Fast typing or key repeat can deliver several characters at once.
      for (const char of input) {
        if (char === "j") move(1);
        else if (char === "k") move(-1);
        else if (char === "g") move(-accountIds.length);
        else if (char === "G") move(accountIds.length);
        else if (char === "l" && selected) onOpen(selected);
        else if (char === "a" && selected) onAdd(selected);
      }
    },
    { isActive },
  );

  if (rows.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No open accounts in this budget.</Text>
      </Box>
    );
  }

  const selectedRow = rows.findIndex(
    (row) => row.kind === "account" && row.account.id === selected,
  );
  const { start, end } = visibleRange({
    total: rows.length,
    selected: selectedRow,
    height,
  });
  const amountWidth = 14;
  const nameWidth = width - amountWidth - 4;

  return (
    <Box flexDirection="column" paddingX={1}>
      {rows.slice(start, end).map((row) =>
        row.kind === "header" ? (
          <Text key={row.label} bold>
            {fit(row.label, nameWidth)}
            {"  "}
            <Text dimColor>
              {fit(
                formatAmount(row.total, budget.format),
                amountWidth,
                "right",
              )}
            </Text>
          </Text>
        ) : (
          <Text key={row.account.id} inverse={row.account.id === selected}>
            {"  "}
            {fit(row.account.name, nameWidth - 2)}
            {"  "}
            <Text color={row.account.balance < 0 ? "red" : undefined}>
              {fit(
                formatAmount(row.account.balance, budget.format),
                amountWidth,
                "right",
              )}
            </Text>
          </Text>
        ),
      )}
    </Box>
  );
}
