import { Box, Text, useInput } from "ink";
import { useState } from "react";
import {
  addTransaction,
  editTransaction,
  type Payee,
  type Transaction,
} from "../actual";
import { useBudget, type CategoryOption } from "../budget-context";
import { Picker } from "../components/picker";
import { TextInput } from "../components/text-input";
import { formatAmountForInput, parseAmount, todayISO } from "../format";

interface Props {
  accountId: string;
  /** When set, the form edits this transaction instead of creating one. */
  initial?: Transaction;
  isActive: boolean;
  onDone: () => void;
  onCancel: () => void;
}

const FIELDS = [
  "date",
  "payee",
  "category",
  "amount",
  "kind",
  "notes",
  "cleared",
] as const;
type Field = (typeof FIELDS)[number];
type Kind = "payment" | "deposit";

const LABEL_WIDTH = 10;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function categoryLabel(category: CategoryOption): string {
  return category.name;
}

function payeeLabel(payee: Payee): string {
  return payee.name;
}

export function TransactionFormScreen({
  accountId,
  initial,
  isActive,
  onDone,
  onCancel,
}: Props) {
  const budget = useBudget();
  const account = budget.accounts.find((a) => a.id === accountId);
  const [field, setField] = useState<Field>("date");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [payee, setPayee] = useState(budget.payeeName(initial?.payee));
  const [category, setCategory] = useState(
    budget.categoryName(initial?.category),
  );
  const [amount, setAmount] = useState(
    initial
      ? formatAmountForInput(Math.abs(initial.amount), budget.format)
      : "",
  );
  const [kind, setKind] = useState<Kind>(
    initial && initial.amount > 0 ? "deposit" : "payment",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [cleared, setCleared] = useState(initial?.cleared ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fieldIndex = FIELDS.indexOf(field);
  const focus = (delta: number) => {
    const next = Math.min(FIELDS.length - 1, Math.max(0, fieldIndex + delta));
    setField(FIELDS[next]);
  };

  const save = async () => {
    if (saving) return;
    if (!isValidDate(date)) return setError("Date must be YYYY-MM-DD");
    const cents = parseAmount(amount, budget.format);
    if (cents === null) return setError("Amount is not a number");
    const payeeMatch = budget.payees.find(
      (p) => p.name.toLowerCase() === payee.trim().toLowerCase(),
    );
    const categoryMatch = budget.categories.find(
      (c) => c.name.toLowerCase() === category.trim().toLowerCase(),
    );
    if (category.trim() !== "" && !categoryMatch)
      return setError(`Unknown category "${category}"`);

    const transaction = {
      date,
      amount: kind === "payment" ? -Math.abs(cents) : Math.abs(cents),
      payeeId: payeeMatch?.id,
      payeeName: payeeMatch ? undefined : payee.trim() || undefined,
      categoryId: categoryMatch?.id,
      notes: notes.trim() || undefined,
      cleared,
    };

    setSaving(true);
    setError(null);
    try {
      await budget.mutate(() =>
        initial
          ? editTransaction(initial.id, transaction)
          : addTransaction(accountId, transaction),
      );
      budget.notify(initial ? "Transaction updated" : "Transaction added");
      onDone();
    } catch (failure) {
      setSaving(false);
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  const advance = () =>
    fieldIndex === FIELDS.length - 1 ? void save() : focus(1);

  useInput(
    (input, key) => {
      if (key.escape) return onCancel();
      if (key.ctrl && input === "s") return void save();
      if (key.tab) return key.shift ? focus(-1) : focus(1);
      // Pickers own Enter and the arrow keys while they have focus.
      const inPicker = field === "payee" || field === "category";
      if (!inPicker && key.downArrow) return focus(1);
      if (!inPicker && key.upArrow) return focus(-1);
      if (!inPicker && key.return) return advance();
      if (
        field === "kind" &&
        (input === " " || key.leftArrow || key.rightArrow)
      ) {
        setKind((current) => (current === "payment" ? "deposit" : "payment"));
      }
      if (field === "cleared" && input === " ")
        setCleared((current) => !current);
    },
    { isActive },
  );

  const label = (name: Field, text: string) => (
    <Text color={field === name ? "cyan" : undefined} bold={field === name}>
      {text.padEnd(LABEL_WIDTH)}
    </Text>
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>
        {initial ? "Edit" : "New"} transaction in {account?.name ?? "account"}
      </Text>
      <Box marginTop={1}>
        {label("date", "Date")}
        <TextInput
          value={date}
          onChange={setDate}
          isActive={isActive && field === "date"}
        />
      </Box>
      <Box>
        {label("payee", "Payee")}
        <Picker
          value={payee}
          onChange={setPayee}
          onAccept={(chosen) => {
            if (chosen) setPayee(chosen.name);
            advance();
          }}
          options={budget.payees}
          label={payeeLabel}
          isActive={isActive && field === "payee"}
          placeholder="new or existing payee"
        />
      </Box>
      <Box>
        {label("category", "Category")}
        <Picker
          value={category}
          onChange={setCategory}
          onAccept={(chosen) => {
            if (chosen) setCategory(chosen.name);
            advance();
          }}
          options={budget.categories}
          label={categoryLabel}
          detail={(c) => c.group}
          isActive={isActive && field === "category"}
          placeholder="leave empty for uncategorized"
        />
      </Box>
      <Box>
        {label("amount", "Amount")}
        <TextInput
          value={amount}
          onChange={setAmount}
          isActive={isActive && field === "amount"}
          placeholder="0.00"
        />
      </Box>
      <Box>
        {label("kind", "Type")}
        <Text>
          <Text inverse={kind === "payment"}> Payment </Text>{" "}
          <Text inverse={kind === "deposit"}> Deposit </Text>
          <Text dimColor> space to switch</Text>
        </Text>
      </Box>
      <Box>
        {label("notes", "Notes")}
        <TextInput
          value={notes}
          onChange={setNotes}
          isActive={isActive && field === "notes"}
        />
      </Box>
      <Box>
        {label("cleared", "Cleared")}
        <Text>
          {cleared ? "[x]" : "[ ]"}
          <Text dimColor> space to toggle</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        {error ? (
          <Text color="red">{error}</Text>
        ) : (
          <Text dimColor>
            {saving
              ? "Saving…"
              : "Tab: next field · Ctrl+S: save · Esc: cancel"}
          </Text>
        )}
      </Box>
    </Box>
  );
}
