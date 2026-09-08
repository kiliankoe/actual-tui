import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as actual from "./actual";
import type { Config } from "./config";
import { DEFAULT_AMOUNT_FORMAT, type AmountFormat } from "./format";

export interface AccountRow extends actual.Account {
  balance: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  group: string;
  isIncome: boolean;
}

export type SyncState =
  | { status: "idle" | "syncing"; lastSyncedAt?: Date }
  | { status: "error"; message: string; lastSyncedAt?: Date };

export interface Budget {
  ready: boolean;
  accounts: AccountRow[];
  categories: CategoryOption[];
  payees: actual.Payee[];
  format: AmountFormat;
  sync: SyncState;
  /** Bumped after every refresh so screens can reload their own data. */
  version: number;
  message: string | null;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  /** Runs a local change, refreshes, then pushes to the server in the background. */
  mutate: (change: () => Promise<void>) => Promise<void>;
  payeeName: (id: string | null | undefined) => string;
  categoryName: (id: string | null | undefined) => string;
}

const BudgetContext = createContext<Budget | null>(null);

const MESSAGE_TIMEOUT_MS = 4000;

interface ProviderProps {
  config: Config;
  onFatal: (error: Error) => void;
  children: ReactNode;
}

export function BudgetProvider({ config, onFatal, children }: ProviderProps) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [payees, setPayees] = useState<actual.Payee[]>([]);
  const [format, setFormat] = useState<AmountFormat>(DEFAULT_AMOUNT_FORMAT);
  const [sync, setSync] = useState<SyncState>({ status: "idle" });
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<NodeJS.Timeout | null>(null);

  const notify = useCallback((text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(
      () => setMessage(null),
      MESSAGE_TIMEOUT_MS,
    );
  }, []);

  const refresh = useCallback(async () => {
    const [nextAccounts, nextCategories, groups, nextPayees, nextFormat] =
      await Promise.all([
        actual.getAccountsWithBalances(),
        actual.getCategories(),
        actual.getCategoryGroups(),
        actual.getPayees(),
        actual.getAmountFormat(),
      ]);
    const groupNames = new Map(groups.map((group) => [group.id, group.name]));
    setAccounts(nextAccounts);
    setCategories(
      nextCategories
        .filter((category) => !category.hidden)
        .map((category) => ({
          id: category.id,
          name: category.name,
          group: groupNames.get(category.group_id) ?? "",
          isIncome: Boolean(category.is_income),
        })),
    );
    setPayees(nextPayees);
    setFormat(nextFormat);
    setVersion((current) => current + 1);
  }, []);

  const syncNow = useCallback(async () => {
    setSync((current) => ({
      status: "syncing",
      lastSyncedAt: current.lastSyncedAt,
    }));
    try {
      await actual.sync();
      await refresh();
      setSync({ status: "idle", lastSyncedAt: new Date() });
    } catch (error) {
      setSync((current) => ({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        lastSyncedAt: current.lastSyncedAt,
      }));
    }
  }, [refresh]);

  const mutate = useCallback(
    async (change: () => Promise<void>) => {
      await change();
      await refresh();
      void syncNow();
    },
    [refresh, syncNow],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await actual.connect(config);
        await refresh();
        if (cancelled) return;
        setSync({ status: "idle", lastSyncedAt: new Date() });
        setReady(true);
      } catch (error) {
        if (!cancelled)
          onFatal(error instanceof Error ? error : new Error(String(error)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config, onFatal, refresh]);

  const payeeNames = useMemo(
    () => new Map(payees.map((payee) => [payee.id, payee.name])),
    [payees],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const value = useMemo<Budget>(
    () => ({
      ready,
      accounts,
      categories,
      payees,
      format,
      sync,
      version,
      message,
      notify,
      refresh,
      syncNow,
      mutate,
      payeeName: (id) => (id ? (payeeNames.get(id) ?? "") : ""),
      categoryName: (id) => (id ? (categoryNames.get(id) ?? "") : ""),
    }),
    [
      ready,
      accounts,
      categories,
      payees,
      format,
      sync,
      version,
      message,
      notify,
      refresh,
      syncNow,
      mutate,
      payeeNames,
      categoryNames,
    ],
  );

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

export function useBudget(): Budget {
  const budget = useContext(BudgetContext);
  if (!budget) throw new Error("useBudget must be used inside BudgetProvider");
  return budget;
}
