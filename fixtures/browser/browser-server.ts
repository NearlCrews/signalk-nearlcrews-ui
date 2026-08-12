const DEFAULT_BROWSER_PORT = 4173;
const rawPort = process.env.SNUI_BROWSER_PORT;
const browserPort =
  rawPort === undefined ? DEFAULT_BROWSER_PORT : Number(rawPort);

if (
  !Number.isSafeInteger(browserPort) ||
  browserPort < 1024 ||
  browserPort > 65_535
) {
  throw new Error(
    `SNUI_BROWSER_PORT must be an integer from 1024 through 65535; received ${JSON.stringify(rawPort)}.`,
  );
}

export const BROWSER_HOST = "127.0.0.1";
export const BROWSER_PORT = browserPort;
export const BROWSER_URL = `http://${BROWSER_HOST}:${String(BROWSER_PORT)}`;
