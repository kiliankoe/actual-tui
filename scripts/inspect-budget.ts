/**
 * Prints accounts and this month's transactions as seen by an independent
 * client, which is the honest way to check that a change really synced.
 *
 * Uses the same env vars as the TUI; point ACTUAL_DATA_DIR at a directory the
 * TUI does not use so both behave like separate devices.
 */
import * as api from "@actual-app/api";
import { loadConfig } from "../src/config";
import { formatAmount } from "../src/format";

const config = loadConfig();
await api.init({
  dataDir: config.dataDir,
  serverURL: config.serverURL,
  password: config.password,
});
await api.downloadBudget(config.syncId);
await api.sync();

const payees = new Map((await api.getPayees()).map((p) => [p.id, p.name]));
const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
for (const account of await api.getAccounts()) {
  const balance = await api.getAccountBalance(account.id);
  console.log(
    `\n${account.name}${account.closed ? " (closed)" : ""}: ${formatAmount(balance)}`,
  );
  for (const t of await api.getTransactions(
    account.id,
    monthStart,
    "2999-12-31",
  )) {
    const marks = `${t.cleared ? "cleared" : "uncleared"}${t.reconciled ? ", reconciled" : ""}`;
    console.log(
      `  ${t.date}  ${(payees.get(t.payee ?? "") ?? "").padEnd(20)} ${formatAmount(t.amount).padStart(12)}  ${marks}`,
    );
  }
}
await api.shutdown();
