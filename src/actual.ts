import { mkdirSync } from "node:fs";
import * as api from "@actual-app/api";
import type { Config } from "./config";
import {
  DEFAULT_AMOUNT_FORMAT,
  isNumberFormat,
  type AmountFormat,
} from "./format";
import { bundledApiVersion, versionNotice, withNotice } from "./version";

// Derived from the API's return types so they track package updates for free.
export type Account = Awaited<ReturnType<typeof api.getAccounts>>[number];
export type Transaction = Awaited<
  ReturnType<typeof api.getTransactions>
>[number];
export type Category = Awaited<ReturnType<typeof api.getCategories>>[number];
export type Payee = Awaited<ReturnType<typeof api.getPayees>>[number];

export interface NewTransaction {
  date: string;
  amount: number;
  payeeId?: string;
  payeeName?: string;
  categoryId?: string;
  notes?: string;
  cleared: boolean;
}

/** Resolves with a warning when the server runs a different Actual version. */
export async function connect(config: Config): Promise<string | null> {
  // The engine refuses to start on a missing data directory.
  mkdirSync(config.dataDir, { recursive: true });
  await api.init({
    dataDir: config.dataDir,
    serverURL: config.serverURL,
    password: config.password,
  });
  const notice = versionNotice(await serverVersion(), bundledApiVersion());
  try {
    await api.downloadBudget(
      config.syncId,
      config.encryptionPassword
        ? { password: config.encryptionPassword }
        : undefined,
    );
  } catch (error) {
    // A schema mismatch surfaces as a cryptic engine error; name the versions.
    throw withNotice(error, notice);
  }
  return notice;
}

async function serverVersion(): Promise<string | null> {
  // An unreachable server fails the download with a clearer error anyway.
  const result = await api.getServerVersion();
  return "version" in result ? result.version : null;
}

export async function disconnect(): Promise<void> {
  await api.shutdown();
}

export async function getAmountFormat(): Promise<AmountFormat> {
  const prefs = await api.getPreferences();
  return {
    numberFormat: isNumberFormat(prefs.numberFormat)
      ? prefs.numberFormat
      : DEFAULT_AMOUNT_FORMAT.numberFormat,
    hideFraction: prefs.hideFraction === "true",
  };
}

export async function getAccountsWithBalances(): Promise<
  (Account & { balance: number })[]
> {
  const accounts = await api.getAccounts();
  return Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balance: await api.getAccountBalance(account.id),
    })),
  );
}

// Wide bounds instead of a "no filter" mode: the API insists on a date range.
const EARLIEST_DATE = "1900-01-01";
const LATEST_DATE = "2999-12-31";

export function getAllTransactions(accountId: string): Promise<Transaction[]> {
  return api.getTransactions(accountId, EARLIEST_DATE, LATEST_DATE);
}

export async function setCleared(
  transactionId: string,
  cleared: boolean,
): Promise<void> {
  await api.updateTransaction(transactionId, { cleared });
}

export async function addTransaction(
  accountId: string,
  transaction: NewTransaction,
): Promise<void> {
  await api.addTransactions(
    accountId,
    [
      {
        date: transaction.date,
        amount: transaction.amount,
        payee: transaction.payeeId,
        payee_name: transaction.payeeName,
        category: transaction.categoryId,
        notes: transaction.notes,
        cleared: transaction.cleared,
      },
    ],
    {
      // Lets transfer payees create the matching transaction on the other account.
      runTransfers: true,
    },
  );
}

export async function editTransaction(
  transactionId: string,
  transaction: NewTransaction,
): Promise<void> {
  // Unlike addTransactions, updates take a payee id only, so a new name needs
  // a payee record first.
  let payee = transaction.payeeId ?? null;
  if (!payee && transaction.payeeName) {
    payee = await api.createPayee({ name: transaction.payeeName });
  }
  const fields: Record<string, unknown> = {
    date: transaction.date,
    amount: transaction.amount,
    payee,
    // The engine needs an explicit null to clear a category; the type only
    // admits strings.
    category: transaction.categoryId ?? null,
    notes: transaction.notes ?? "",
    cleared: transaction.cleared,
  };
  await api.updateTransaction(transactionId, fields as Partial<Transaction>);
}

export {
  deleteTransaction,
  getCategories,
  getCategoryGroups,
  getPayees,
  sync,
} from "@actual-app/api";
