/**
 * Bundlers replace `process.env.NODE_ENV` with a literal, so a production
 * panel drops every development-only branch, while Node keeps the real value
 * for tests. The declaration is local because the published build compiles
 * against the React types alone, without the Node globals.
 */
declare const process: {
  readonly env: { readonly NODE_ENV?: string | undefined };
};

/** Whether development-only diagnostics such as console warnings should run. */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}
