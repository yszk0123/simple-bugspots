import { parseArgs } from 'node:util';
import { defaults } from './utils/defaults';

const DEFAULT_PROGRESS_INTERVAL = 3000;
const DEFAULT_SIMILARITY = 80;

export type BugspotsOptions = {
  baseDir: string;
  depth: number;
  concurrency: number;
  interval: number;
  similarity: number;
  regex: RegExp;
};

export const bugspotsDefaultOptions: BugspotsOptions = {
  baseDir: '.',
  depth: 1,
  concurrency: 10,
  regex: /\b(fix(es|ed)?|close(s|d)?)\b/i,
  interval: DEFAULT_PROGRESS_INTERVAL,
  similarity: DEFAULT_SIMILARITY,
};

function parseNumberIfExist(s: string | null | undefined): number | undefined {
  return s != null ? Number(s) : undefined;
}

export function parseBugspotsOptions(args: string[]): BugspotsOptions {
  const { values } = parseArgs({
    args,
    options: {
      concurrency: { type: 'string' },
      depth: { type: 'string' },
      dir: { type: 'string' },
      interval: { type: 'string' },
      regex: { type: 'string' },
      similarity: { type: 'string' },
    },
  });

  const baseDir = values.dir ?? '.';
  const depth = parseNumberIfExist(values.depth);
  const concurrency = parseNumberIfExist(values.concurrency);
  const regexString = values.regex ?? '\\b(fix(es|ed)?|close(s|d)?)\\b';
  const regex = new RegExp(regexString, 'i');
  const interval = parseNumberIfExist(values.interval);
  const similarity = parseNumberIfExist(values.similarity);

  if (
    Number.isNaN(concurrency) ||
    Number.isNaN(depth) ||
    Number.isNaN(interval) ||
    Number.isNaN(similarity)
  ) {
    throw new Error('Invalid arguments');
  }

  const options: BugspotsOptions = defaults(
    {
      baseDir,
      concurrency,
      depth,
      interval,
      regex,
      similarity,
    },
    bugspotsDefaultOptions,
  );
  return options;
}
