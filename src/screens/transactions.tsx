import { Box, Text, useInput } from "ink";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  deleteTransaction,
  getAllTransactions,
  setCleared,
  type Transaction,
} from "../actual";
import { useBudget } from "../budget-context";
import { FilterLine } from "../components/filter-line";
import { formatAmount } from "../format";
import { matchesQuery, visibleRange } from "../list";
import { fit } from "../text";

interface Props {
  accountId: string;
  width: number;
  height: number;
  isActive: boolean;
  /** Owned by the shell so the selection survives a trip through the form. */
  selectedId: string | null;
  onSelect: Dispatch<SetStateAction<string | null>>;
  /** Also shell-owned, so a search survives editing one of its results. */
  filter: string;
  onFilterChange: (filter: string) => void;
  /** Text for the header's right corner, e.g. the sum of filtered rows. */
  onHeaderInfo: (info: string | null) => void;
  onBack: () => void;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  /** Reports when this screen needs every key for itself (filter, prompts). */
  onExclusiveInput: (exclusive: boolean) => void;
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
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  onHeaderInfo,
  onBack,
  onAdd,
  onEdit,
  onExclusiveInput,
}: Props) {
  const budget = useBudget();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllTransactions(accountId).then((list) => {
      if (!cancelled) setTransactions([...list].sort(byDateDescending));
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, budget.version]);

  useEffect(() => {
    onExclusiveInput(filtering || confirmingDelete);
    return () => onExclusiveInput(false);
  }, [filtering, confirmingDelete, onExclusiveInput]);

  const describe = (transaction: Transaction) =>
    `${transaction.date} ${budget.payeeName(transaction.payee)} ${
      transaction.is_parent
        ? "Split"
        : budget.categoryName(transaction.category)
    } ${transaction.notes ?? ""} ${formatAmount(transaction.amount, budget.format)}`;

  const rows = (transactions ?? []).filter((transaction) =>
    matchesQuery(describe(transaction), filter),
  );
  const selectedIndex = Math.max(
    0,
    rows.findIndex((t) => t.id === selectedId),
  );
  const selected = rows[selectedIndex];

  // Top-level rows carry a split's full amount, so summing them is exact.
  const sumOf = (list: Transaction[]) =>
    list.reduce((sum, t) => sum + t.amount, 0);
  const filteredSum = sumOf(rows);
  const balance = sumOf(transactions ?? []);
  const clearedBalance = sumOf(
    (transactions ?? []).filter((t) => t.cleared || t.reconciled),
  );
  useEffect(() => {
    const money = (cents: number) => formatAmount(cents, budget.format);
    if (transactions === null) onHeaderInfo(null);
    else if (filter) onHeaderInfo(`Σ ${money(filteredSum)}`);
    else onHeaderInfo(`Cleared ${money(clearedBalance)} (${money(balance)})`);
  }, [
    transactions,
    filter,
    filteredSum,
    balance,
    clearedBalance,
    budget.format,
    onHeaderInfo,
  ]);
  useEffect(() => () => onHeaderInfo(null), [onHeaderInfo]);

  // Functional update so bursts of key repeats each move one step.
  const move = (delta: number) =>
    onSelect((current) => {
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

  const edit = () => {
    if (!selected) return;
    if (selected.reconciled)
      return budget.notify("Reconciled transactions are locked");
    if (selected.is_parent)
      return budget.notify("Split transactions can't be edited here");
    onEdit(selected);
  };

  const remove = async () => {
    if (!selected) return;
    setConfirmingDelete(false);
    // Land on a neighbour instead of jumping back to the top.
    const neighbour = rows[selectedIndex + 1] ?? rows[selectedIndex - 1];
    onSelect(neighbour?.id ?? null);
    await budget.mutate(() => deleteTransaction(selected.id));
    budget.notify("Transaction deleted");
  };

  const showFilter = filtering || filter !== "";
  const listHeight = Math.max(
    1,
    height - 1 - (showFilter ? 1 : 0) - (confirmingDelete ? 1 : 0),
  );

  useInput(
    (input, key) => {
      if (key.escape) return filter ? onFilterChange("") : onBack();
      if (key.leftArrow || key.backspace || key.delete) return onBack();
      if (key.downArrow) return move(1);
      if (key.upArrow) return move(-1);
      if (key.pageDown) return move(listHeight);
      if (key.pageUp) return move(-listHeight);
      // Fast typing or key repeat can deliver several characters at once.
      for (const char of input) {
        if (char === "/") setFiltering(true);
        else if (char === "h") onBack();
        else if (char === "j") move(1);
        else if (char === "k") move(-1);
        else if (char === "g") move(-rows.length);
        else if (char === "G") move(rows.length);
        else if (char === "a") onAdd();
        else if (char === "c") void toggleCleared();
        else if (char === "e") edit();
        else if (char === "d" && selected) setConfirmingDelete(true);
      }
    },
    { isActive: isActive && !filtering && !confirmingDelete },
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

  useInput(
    (input) => {
      if (input === "y") void remove();
      else setConfirmingDelete(false);
    },
    { isActive: isActive && confirmingDelete },
  );

  const columns = columnWidths(width);
  const { start, end } = visibleRange({
    total: rows.length,
    selected: selectedIndex,
    height: listHeight,
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold underline wrap="truncate">
        {fit("Date", DATE_WIDTH)} {fit("Payee", columns.payee)}{" "}
        {fit("Category", columns.category)}
        {columns.notes > 0 ? ` ${fit("Notes", columns.notes)}` : ""}{" "}
        {fit("Amount", AMOUNT_WIDTH, "right")} {fit("", MARK_WIDTH)}
      </Text>
      {showFilter && (
        <FilterLine
          value={filter}
          onChange={onFilterChange}
          isActive={isActive && filtering}
          matches={rows.length}
          total={transactions?.length ?? 0}
        />
      )}
      {transactions === null ? (
        <Text dimColor>Loading…</Text>
      ) : rows.length === 0 ? (
        <Text dimColor>
          {transactions.length === 0
            ? "No transactions yet. Press a to add one."
            : "No transactions match the filter."}
        </Text>
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
      {confirmingDelete && selected && (
        <Text color="yellow" wrap="truncate">
          Delete {selected.date} {budget.payeeName(selected.payee)}{" "}
          {formatAmount(selected.amount, budget.format)}? <Text bold>y</Text>/N
        </Text>
      )}
    </Box>
  );
}
