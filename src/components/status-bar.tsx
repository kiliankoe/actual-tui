import { Box, Text } from "ink";
import { useBudget, type SyncState } from "../budget-context";

function describeSync(sync: SyncState): { text: string; color?: string } {
  if (sync.status === "syncing") return { text: "syncing…", color: "yellow" };
  if (sync.status === "error")
    return { text: `sync failed: ${sync.message}`, color: "red" };
  if (!sync.lastSyncedAt) return { text: "" };
  const time = sync.lastSyncedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { text: `synced ${time}`, color: "green" };
}

export function StatusBar({ hints }: { hints: string }) {
  const { sync, message } = useBudget();
  const status = describeSync(sync);
  return (
    <Box justifyContent="space-between" paddingX={1}>
      {message ? (
        <Text color="cyan">{message}</Text>
      ) : (
        <Text dimColor wrap="truncate">
          {hints}
        </Text>
      )}
      <Text color={status.color}>{status.text}</Text>
    </Box>
  );
}
