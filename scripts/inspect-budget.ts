/**
 * Prints accounts and recent transactions as seen by an independent client,
 * which is the honest way to check that a change really synced.
 *
 * Uses the same env vars as the TUI; point ACTUAL_DATA_DIR at a directory the
 * TUI does not use so both behave like separate devices.
 */
import * as api from "@actual-app/api";
import { loadConfig } from "../src/config";
import { formatAmount } from "../src/format";

const DAYS = 45;

const config = loadConfig();
await api.init({
  dataDir: config.dataDir,
  serverURL: config.serverURL,
  password: config.password,
});
await api.downloadBudget(config.syncId);
await api.sync();

const payees = new Map((await api.getPayees()).map((p) => [p.id, p.name]));
const since = new Date();
since.setDate(since.getDate() - DAYS);
const sinceISO = since.toISOString().slice(0, 10);

for (const account of await api.getAccounts()) {
  const balance = await api.getAccountBalance(account.id);
  const closed = account.closed ? " (closed)" : "";
  console.log(`\n${account.name}${closed}: ${formatAmount(balance)}`);
  for (const t of await api.getTransactions(
    account.id,
    sinceISO,
    "2999-12-31",
  )) {
    const payee = (payees.get(t.payee ?? "") ?? "").padEnd(20);
    const amount = formatAmount(t.amount).padStart(12);
    const marks = `${t.cleared ? "cleared" : "uncleared"}${t.reconciled ? ", reconciled" : ""}`;
    const notes = t.notes ? `  "${t.notes}"` : "";
    console.log(`  ${t.date}  ${payee} ${amount}  ${marks}${notes}`);
  }
}
await api.shutdown();
