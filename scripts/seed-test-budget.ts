/**
 * Creates a throwaway budget on a local sync server so the TUI can be
 * exercised without touching real data. Prints the sync ID to use.
 *
 * Usage: ACTUAL_SERVER_URL=http://127.0.0.1:5007 ACTUAL_PASSWORD=test \
 *        pnpm tsx scripts/seed-test-budget.ts
 */
import { mkdirSync } from "node:fs";
import * as api from "@actual-app/api";

const serverURL = process.env.ACTUAL_SERVER_URL ?? "http://127.0.0.1:5007";
const password = process.env.ACTUAL_PASSWORD ?? "test";
const dataDir = process.env.SEED_DATA_DIR ?? "/tmp/actual-tui-seed-data";

async function bootstrapIfNeeded(): Promise<void> {
  const status = await fetch(`${serverURL}/account/needs-bootstrap`).then((r) =>
    r.json(),
  );
  if (!status.data?.bootstrapped) {
    const result = await fetch(`${serverURL}/account/bootstrap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).then((r) => r.json());
    if (result.status !== "ok")
      throw new Error(`Bootstrap failed: ${JSON.stringify(result)}`);
    console.log("Server bootstrapped with the given password.");
  }
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

await bootstrapIfNeeded();
mkdirSync(dataDir, { recursive: true });
const engine = await api.init({ dataDir, serverURL, password });

const created = await engine.send("create-budget", {
  budgetName: "TUI Test Budget",
});
if (created?.error) throw new Error(`create-budget failed: ${created.error}`);

const checking = await api.createAccount(
  { name: "Checking", offbudget: false },
  250000,
);
const savings = await api.createAccount(
  { name: "Savings", offbudget: false },
  1200000,
);
await api.createAccount({ name: "Brokerage", offbudget: true }, 5432100);
const closed = await api.createAccount(
  { name: "Old Card", offbudget: false },
  0,
);
await api.closeAccount(closed);

const groupId = await api.createCategoryGroup({
  name: "Everyday",
  is_income: false,
});
const groceries = await api.createCategory({
  name: "Groceries",
  group_id: groupId,
});
const eatingOut = await api.createCategory({
  name: "Eating Out",
  group_id: groupId,
});
const transport = await api.createCategory({
  name: "Transport",
  group_id: groupId,
});
const incomeGroup = (await api.getCategoryGroups()).find((g) => g.is_income);
const salary = incomeGroup
  ? await api.createCategory({
      name: "Salary",
      group_id: incomeGroup.id,
      is_income: true,
    })
  : undefined;

const payees = [
  "Rewe",
  "Edeka",
  "Deutsche Bahn",
  "Café Central",
  "Employer GmbH",
  "Amazon",
];
const categoriesByPayee: Record<string, string | undefined> = {
  Rewe: groceries,
  Edeka: groceries,
  "Deutsche Bahn": transport,
  "Café Central": eatingOut,
  "Employer GmbH": salary,
  Amazon: undefined,
};

const transactions = [];
for (let day = 0; day < 60; day++) {
  if (day % 3 !== 0) continue;
  const payee = payees[(day / 3) % payees.length];
  const isIncome = payee === "Employer GmbH";
  transactions.push({
    date: daysAgo(day),
    amount: isIncome ? 320000 : -Math.round(500 + ((day * 7919) % 9000)),
    payee_name: payee,
    category: categoriesByPayee[payee],
    notes: day % 2 === 0 ? `note for day ${day}` : undefined,
    cleared: day > 10,
  });
}
await api.addTransactions(checking, transactions);

// A transfer and a split so the list has every row shape to render.
const savingsPayee = (await api.getPayees()).find(
  (p) => p.transfer_acct === savings,
);
await api.addTransactions(
  checking,
  [
    {
      date: daysAgo(4),
      amount: -50000,
      payee: savingsPayee?.id,
      notes: "monthly savings",
    },
  ],
  { runTransfers: true },
);
await api.addTransactions(checking, [
  {
    date: daysAgo(2),
    amount: -4200,
    payee_name: "Rewe",
    subtransactions: [
      { amount: -3000, category: groceries },
      { amount: -1200, category: eatingOut },
    ],
  },
]);

const [oldest] = await api.getTransactions(checking, daysAgo(400), daysAgo(50));
if (oldest)
  await api.updateTransaction(oldest.id, { cleared: true, reconciled: true });

await api.sync();
const budgets = await api.getBudgets();
const budget = budgets.find((b) => b.name === "TUI Test Budget");
await api.shutdown();

// Actual calls the group id the "Sync ID" in its settings; the file id is something else.
console.log(`\nSync ID: ${budget?.groupId}`);
console.log(
  `Run the TUI with:\n  ACTUAL_SERVER_URL=${serverURL} ACTUAL_PASSWORD=${password} ACTUAL_SYNC_ID=${budget?.groupId} ACTUAL_DATA_DIR=/tmp/actual-tui-test-data pnpm dev`,
);
