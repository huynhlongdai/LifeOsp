export type ApiConfig = {
  host: string;
  port: number;
  databaseUrl?: string;
};

export class ApiConfigError extends Error {
  override name = "ApiConfigError";
}

export function loadApiConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const host = (env.HOST ?? "0.0.0.0").trim();
  if (!host) {
    throw new ApiConfigError("HOST must not be empty");
  }

  const portRaw = env.PORT ?? "4000";
  if (!/^\d+$/.test(portRaw)) {
    throw new ApiConfigError(`PORT must be an integer between 1 and 65535; received ${JSON.stringify(portRaw)}`);
  }

  const port = Number(portRaw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new ApiConfigError(`PORT must be an integer between 1 and 65535; received ${JSON.stringify(portRaw)}`);
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return { host, port };
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new ApiConfigError("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (parsedDatabaseUrl.protocol !== "postgresql:" && parsedDatabaseUrl.protocol !== "postgres:") {
    throw new ApiConfigError("DATABASE_URL protocol must be postgresql: or postgres:");
  }

  return { host, port, databaseUrl };
}
