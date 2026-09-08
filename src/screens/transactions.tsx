import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { getAllTransactions, setCleared, type Transaction } from "../actual";
import { useBudget } from "../budget-context";
import { formatAmount } from "../format";
import { visibleRange } from "../list";
import { fit } from "../text";

interface Props {
  accountId: string;
  width: number;
  height: number;
  isActive: boolean;
  onBack: () => void;
  onAdd: () => void;
}

const DATE_WIDTH = 10;
const AMOUNT_WIDTH = 14;
const MARK_WIDTH = 1;
const PADDING = 2;

function columnWidths(width: number) {
  const showNotes = width >= 110;
  // One space between each column: date, payee, category, [notes], amount, mark.
  const gaps = showNotes ? 5 : 4;
  const remaining = Math.max(
    20,
    width - PADDING - DATE_WIDTH - AMOUNT_WIDTH - MARK_WIDTH - gaps,
  );
  const notes = showNotes ? Math.floor(remaining * 0.25) : 0;
  const payee = Math.floor((remaining - notes) * 0.55);
  const category = remaining - notes - payee;
  return { payee, category, notes };
}

function byDateDescending(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.sort_order ?? 0) - (a.sort_order ?? 0);
}

function ClearedMark({ transaction }: { transaction: Transaction }) {
  if (transaction.reconciled) return <Text color="cyan">◆</Text>;
  if (transaction.cleared) return <Text color="green">●</Text>;
  return <Text dimColor>○</Text>;
}

export function TransactionsScreen({
  accountId,
  width,
  height,
  isActive,
  onBack,
  onAdd,
}: Props) {
  const budget = useBudget();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllTransactions(accountId).then((list) => {
      if (!cancelled) setTransactions([...list].sort(byDateDescending));
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, budget.version]);

  const rows = transactions ?? [];
  const selectedIndex = Math.max(
    0,
    rows.findIndex((t) => t.id === selectedId),
  );
  const selected = rows[selectedIndex];
  const listHeight = Math.max(1, height - 1);

  // Functional update so bursts of key repeats each move one step.
  const move = (delta: number) =>
    setSelectedId((current) => {
      const index = Math.max(
        0,
        rows.findIndex((t) => t.id === current),
      );
      const next = Math.min(rows.length - 1, Math.max(0, index + delta));
      return rows[next]?.id ?? null;
    });

  const toggleCleared = async () => {
    if (!selected) return;
    if (selected.reconciled) {
      budget.notify("Reconciled transactions are locked");
      return;
    }
    await budget.mutate(() => setCleared(selected.id, !selected.cleared));
  };

  useInput(
    (input, key) => {
      if (key.escape || key.leftArrow || key.backspace || key.delete)
        return onBack();
      if (key.downArrow) return move(1);
      if (key.upArrow) return move(-1);
      if (key.pageDown) return move(listHeight);
      if (key.pageUp) return move(-listHeight);
      // Fast typing or key repeat can deliver several characters at once.
      for (const char of input) {
        if (char === "h") onBack();
        else if (char === "j") move(1);
        else if (char === "k") move(-1);
        else if (char === "g") move(-rows.length);
        else if (char === "G") move(rows.length);
        else if (char === "a") onAdd();
        else if (char === "c") void toggleCleared();
      }
    },
    { isActive },
  );

  const columns = columnWidths(width);
  const { start, end } = visibleRange({
    total: rows.length,
    selected: selectedIndex,
    height: listHeight,
  });

  const header = (
    <Text bold underline wrap="truncate">
      {fit("Date", DATE_WIDTH)} {fit("Payee", columns.payee)}{" "}
      {fit("Category", columns.category)}
      {columns.notes > 0 ? ` ${fit("Notes", columns.notes)}` : ""}{" "}
      {fit("Amount", AMOUNT_WIDTH, "right")} {fit("", MARK_WIDTH)}
    </Text>
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {header}
      {transactions === null ? (
        <Text dimColor>Loading…</Text>
      ) : rows.length === 0 ? (
        <Text dimColor>No transactions yet. Press a to add one.</Text>
      ) : (
        rows.slice(start, end).map((transaction) => (
          <Text
            key={transaction.id}
            inverse={transaction.id === selected?.id}
            wrap="truncate"
          >
            {fit(transaction.date, DATE_WIDTH)}{" "}
            {fit(budget.payeeName(transaction.payee), columns.payee)}{" "}
            {fit(
              transaction.is_parent
                ? "Split"
                : budget.categoryName(transaction.category),
              columns.category,
            )}
            {columns.notes > 0
              ? ` ${fit(transaction.notes ?? "", columns.notes)}`
              : ""}{" "}
            <Text color={transaction.amount > 0 ? "green" : undefined}>
              {fit(
                formatAmount(transaction.amount, budget.format),
                AMOUNT_WIDTH,
                "right",
              )}
            </Text>{" "}
            <ClearedMark transaction={transaction} />
          </Text>
        ))
      )}
    </Box>
  );
}
