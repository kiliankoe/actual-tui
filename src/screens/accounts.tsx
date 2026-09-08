import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { useBudget, type AccountRow } from "../budget-context";
import { FilterLine } from "../components/filter-line";
import { formatAmount } from "../format";
import { matchesQuery, visibleRange } from "../list";
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
  /** Shell-owned so the search survives opening an account and coming back. */
  filter: string;
  onFilterChange: (filter: string) => void;
  /** Text for the header's right corner, e.g. the sum of filtered balances. */
  onHeaderInfo: (info: string | null) => void;
  /** Reports when this screen needs every key for itself (filter typing). */
  onExclusiveInput: (exclusive: boolean) => void;
}

function buildRows(accounts: AccountRow[]): Row[] {
  const groups = [
    { label: "On budget", accounts: accounts.filter((a) => !a.offbudget) },
    { label: "Off budget", accounts: accounts.filter((a) => a.offbudget) },
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
  filter,
  onFilterChange,
  onHeaderInfo,
  onExclusiveInput,
}: Props) {
  const budget = useBudget();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    onExclusiveInput(filtering);
    return () => onExclusiveInput(false);
  }, [filtering, onExclusiveInput]);

  const open = budget.accounts.filter((account) => !account.closed);
  const rows = buildRows(
    open.filter((account) => matchesQuery(account.name, filter)),
  );
  const accountIds = rows.flatMap((row) =>
    row.kind === "account" ? [row.account.id] : [],
  );
  const filteredSum = rows.reduce(
    (sum, row) => (row.kind === "account" ? sum + row.account.balance : sum),
    0,
  );
  useEffect(() => {
    onHeaderInfo(
      filter ? `Σ ${formatAmount(filteredSum, budget.format)}` : null,
    );
  }, [filter, filteredSum, budget.format, onHeaderInfo]);
  useEffect(() => () => onHeaderInfo(null), [onHeaderInfo]);
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
      if (key.escape) return onFilterChange("");
      if (key.downArrow) return move(1);
      if (key.upArrow) return move(-1);
      if ((key.return || key.rightArrow) && selected) return onOpen(selected);
      // Fast typing or key repeat can deliver several characters at once.
      for (const char of input) {
        if (char === "/") setFiltering(true);
        else if (char === "j") move(1);
        else if (char === "k") move(-1);
        else if (char === "g") move(-accountIds.length);
        else if (char === "G") move(accountIds.length);
        else if ((char === "l" || char === " ") && selected) onOpen(selected);
        else if (char === "a" && selected) onAdd(selected);
      }
    },
    { isActive: isActive && !filtering },
  );

  useInput(
    (_input, key) => {
      if (key.escape) {
        onFilterChange("");
        setFiltering(false);
      } else if (key.return) {
        setFiltering(false);
      } else if (key.downArrow) {
        move(1);
      } else if (key.upArrow) {
        move(-1);
      }
    },
    { isActive: isActive && filtering },
  );

  const showFilter = filtering || filter !== "";
  const listHeight = height - (showFilter ? 1 : 0);
  const selectedRow = rows.findIndex(
    (row) => row.kind === "account" && row.account.id === selected,
  );
  const { start, end } = visibleRange({
    total: rows.length,
    selected: selectedRow,
    height: listHeight,
  });
  const amountWidth = 14;
  const nameWidth = width - amountWidth - 4;

  return (
    <Box flexDirection="column" paddingX={1}>
      {showFilter && (
        <FilterLine
          value={filter}
          onChange={onFilterChange}
          isActive={isActive && filtering}
          matches={accountIds.length}
          total={open.length}
        />
      )}
      {rows.length === 0 ? (
        <Text dimColor>
          {open.length === 0
            ? "No open accounts in this budget."
            : "No accounts match the filter."}
        </Text>
      ) : (
        rows.slice(start, end).map((row) =>
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
        )
      )}
    </Box>
  );
}
