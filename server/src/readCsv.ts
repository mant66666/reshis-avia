import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

export function readCsv(name: string): Record<string, string>[] {
  const file = new URL(`../../data/${name}`, import.meta.url);
  return parse(readFileSync(file, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });
}
