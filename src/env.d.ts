/// <reference types="astro/client" />

declare module "d3-dsv" {
  export function csvParseRows(csv: string): string[][];
  export function csvFormatRows(rows: readonly (readonly string[])[]): string;
}

interface Window {
  __TAURI_INTERNALS__?: {
    invoke?: (cmd: string, args?: unknown, options?: unknown) => Promise<unknown>;
    transformCallback?: (...args: unknown[]) => unknown;
    unregisterCallback?: (...args: unknown[]) => unknown;
  };
}
