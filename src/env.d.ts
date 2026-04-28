/// <reference types="astro/client" />

declare module "d3-dsv" {
  export function csvParseRows(csv: string): string[][];
  export function csvFormatRows(rows: readonly (readonly string[])[]): string;
}
