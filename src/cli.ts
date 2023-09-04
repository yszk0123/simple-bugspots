#!/usr/bin/env node
import { parseArgs } from 'node:util';
import fs from 'node:fs/promises';
import { parse } from './parse';
import { printAsTree } from './printAsTree';

async function main() {
  const args = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
  });

  const files = args.positionals;
  for (const file of files) {
    console.log(`File "${file}"`);

    const code = await fs.readFile(file, 'utf8');
    const trees = parse(code);
    const output = printAsTree(trees);
    console.log(output);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
