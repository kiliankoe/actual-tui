import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  serverURL: string;
  password: string;
  syncId: string;
  dataDir: string;
  encryptionPassword?: string;
}

export class ConfigError extends Error {}

const FIELD_ENV_VARS = {
  serverURL: "ACTUAL_SERVER_URL",
  password: "ACTUAL_PASSWORD",
  syncId: "ACTUAL_SYNC_ID",
} as const;

export function defaultConfigPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const base = env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "actual-tui", "config.json");
}

function defaultDataDir(env: NodeJS.ProcessEnv): string {
  const base = env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return join(base, "actual-tui");
}

function readConfigFile(path: string): Partial<Config> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    throw new ConfigError(`Config file at ${path} is not valid JSON.`);
  }
}

export function loadConfig(
  options: { configPath?: string; env?: NodeJS.ProcessEnv } = {},
): Config {
  const env = options.env ?? process.env;
  const configPath = options.configPath ?? defaultConfigPath(env);
  const file = readConfigFile(configPath);

  const merged = {
    serverURL: env.ACTUAL_SERVER_URL ?? file.serverURL,
    password: env.ACTUAL_PASSWORD ?? file.password,
    syncId: env.ACTUAL_SYNC_ID ?? file.syncId,
    dataDir: env.ACTUAL_DATA_DIR ?? file.dataDir ?? defaultDataDir(env),
    encryptionPassword:
      env.ACTUAL_ENCRYPTION_PASSWORD ?? file.encryptionPassword,
  };

  const missing = (
    Object.keys(FIELD_ENV_VARS) as (keyof typeof FIELD_ENV_VARS)[]
  ).filter((field) => !merged[field]);
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required config: ${missing.join(", ")}. ` +
        `Set them in ${configPath} or via ${missing
          .map((field) => FIELD_ENV_VARS[field])
          .join(", ")}.`,
    );
  }

  return merged as Config;
}
