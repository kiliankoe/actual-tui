import { render } from "ink";
import { disconnect } from "./actual";
import { App } from "./app";
import { ConfigError, loadConfig } from "./config";
import { redirectConsole } from "./log";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

let config;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) fail(error.message);
  throw error;
}

redirectConsole(process.env.ACTUAL_TUI_LOG);

const app = render(<App config={config} />, {
  alternateScreen: true,
  patchConsole: false,
});

let failure: unknown;
try {
  await app.waitUntilExit();
} catch (error) {
  failure = error;
}

try {
  await disconnect();
} catch {
  // The engine may never have started if connecting failed.
}

if (failure) fail(failure instanceof Error ? failure.message : String(failure));
