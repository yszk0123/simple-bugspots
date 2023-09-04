import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { SimpleGit, SimpleGitOptions, simpleGit } from 'simple-git';

const PROGRESS_INTERVAL = 3000;

type Rule = {
  title: string;
  glob: string[];
  filter?: (file: string) => boolean;
  calc?: (own: ResultRule, res: ResultRule[]) => number;
};
type ResultRule = Rule & {
  files: string[];
};

function round(n: number, d: number): number {
  const l = 10 ** d;
  return Math.round(n * l) / l;
}

function pairwise<T>(arr: T[]): [T, T][] {
  const res: [T, T][] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    res.push([arr[i], arr[i + 1]]);
  }
  return res;
}

class Fix {
  commitTime: number;

  constructor(
    public commitIndex: number,
    public message: string,
    commitDate: string,
    public files: string[],
  ) {
    // eslint-disable-next-line no-restricted-globals
    this.commitTime = new Date(commitDate).getTime();
  }
}

class Renamer {
  private index = 0;
  private mapByIndex = new Map<number, Map<string, string>>();
  private head = new Map<string, string>();

  add(commitIndex: number, src: string, dest: string): void {
    const map = this.mapByIndex.get(commitIndex) ?? new Map();
    map.set(src, dest);
    this.mapByIndex.set(commitIndex, map);
  }

  proceedTo(commitIndex: number): void {
    for (; this.index <= commitIndex; this.index += 1) {
      const map = this.mapByIndex.get(this.index);
      if (map) {
        for (const [src, dest] of map) {
          const latest = this.head.get(dest) ?? dest;
          this.head.set(src, latest);
        }
      }
    }
  }

  get(src: string): string | undefined {
    return this.head.get(src);
  }

  applyRename(fixes: Fix[]): void {
    for (const fix of fixes) {
      this.proceedTo(fix.commitIndex);
      fix.files = fix.files.map((file) => this.get(file) ?? file);
    }
  }
}

type GitCommit = { hash: string; date: string; message: string };

type GitDiff =
  | { status: 'A' | 'M' | 'D'; src: string }
  | { status: 'R'; similarity: number; src: string; dest: string };

class Git {
  private git: SimpleGit;

  constructor(
    options: Pick<SimpleGitOptions, 'baseDir' | 'maxConcurrentProcesses'>,
  ) {
    this.git = simpleGit(options);
  }

  async getFiles(commit: string): Promise<string[]> {
    const res = await this.git.diff([commit, '--name-only']);
    const lines = res.trim().split(/\r?\n/);
    return lines;
  }

  async getCommits(depth: number): Promise<GitCommit[]> {
    const logResult = await this.git.log<GitCommit>({
      format: '%H',
      n: depth,
    });
    const commits = logResult.all.slice();
    return commits;
  }

  async getDiff(oldHash: string, newHash: string): Promise<GitDiff[]> {
    const res = await this.git.diff([oldHash, newHash, '--name-status']);

    const diffList: GitDiff[] = res
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        // Example:
        // [A|M|R|D] \t file \n
        // A: Add, M: Modify, R: Rename, D: Delete
        const [status, src, dest] = line.trim().split(/\t/);

        if (status[0] === 'R') {
          const similarity = Number(status.slice(1));
          const diff: GitDiff = { status: 'R' as const, similarity, src, dest };
          return diff;
        }

        const diff: GitDiff = { status: status[0] as 'A' | 'M' | 'D', src };
        return diff;
      });

    return diffList;
  }
}

class Progress {
  private count = 0;
  private lastTime = 0;
  private startTime = 0;

  constructor(
    private total: number,
    private logger: (s: string) => void = console.log,
  ) {}

  start(): void {
    // eslint-disable-next-line no-restricted-globals
    this.startTime = Date.now();
    this.lastTime = this.startTime;

    console.log(`[progress] total: ${this.total}`);
  }

  tick(): void {
    this.count += 1;
    // eslint-disable-next-line no-restricted-globals
    const currentTime = Date.now();
    if (currentTime - this.lastTime > PROGRESS_INTERVAL) {
      const elapsed = currentTime - this.startTime;
      const progress = round((this.count / this.total) * 100, 2);
      const remainingRate = (elapsed / this.count) * (this.total - this.count);
      const remainingSeconds = round(remainingRate / 1000, 2);
      this.lastTime = currentTime;
      this.logger(`[progress] ${progress}% remaining: ${remainingSeconds}s`);
    }
  }
}

type Hotspot = [file: string, score: number];

function calculateHotspots(fixes: Fix[]): Hotspot[] {
  const hotspots = new Map<string, number>();
  // eslint-disable-next-line no-restricted-globals
  const currentTime = Date.now();
  const oldestFixTime = fixes[fixes.length - 1].commitTime;
  for (const fix of fixes) {
    for (const file of fix.files) {
      const hotspot = hotspots.get(file) ?? 0;
      const t =
        1 - (currentTime - fix.commitTime) / (currentTime - oldestFixTime);
      hotspots.set(file, hotspot + 1 / (1 + Math.exp(-12 * t + 12)));
    }
  }
  const sortedHotspots: Hotspot[] = Array.from(hotspots).sort(
    (a, b) => b[1] - a[1],
  );
  return sortedHotspots;
}

async function main(): Promise<void> {
  const pLimit = (await import('p-limit')).default;
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      dir: { type: 'string' },
      depth: { type: 'string' },
      concurrency: { type: 'string' },
      regex: { type: 'string' },
    },
  });
  const baseDir = args.values.dir ?? '.';
  const depth = Number(args.values.depth ?? '1');
  const concurrency = Number(args.values.concurrency ?? '10');
  const regexString = args.values.regex ?? '\\b(fix(es|ed)?|close(s|d)?)\\b';
  const regex = new RegExp(regexString, 'i');
  if (Number.isNaN(depth) || Number.isNaN(concurrency)) {
    return;
  }

  const git = new Git({
    baseDir,
    maxConcurrentProcesses: concurrency,
  });

  const commits = await git.getCommits(depth);
  if (commits.length === 0) {
    return;
  }

  const fixes: Fix[] = [];
  const limit = pLimit(concurrency);
  const total = commits.length - 1;
  const renamer = new Renamer();
  const progress = new Progress(total);

  progress.start();

  await Promise.all(
    pairwise(commits).map(([newCommit, oldCommit], commitIndex) =>
      limit(async () => {
        const diffList = await git.getDiff(oldCommit.hash, newCommit.hash);
        const files: string[] = [];

        for (const diff of diffList) {
          if (diff.status === 'R' && diff.similarity >= 80) {
            renamer.add(commitIndex, diff.src, diff.dest);
          }
          files.push(diff.src);
        }

        if (regex.test(newCommit.message)) {
          fixes.push(
            new Fix(commitIndex, newCommit.message, newCommit.date, files),
          );
        }

        progress.tick();
      }),
    ),
  );

  if (fixes.length === 0) {
    return;
  }

  renamer.applyRename(fixes);

  const hotspots = calculateHotspots(fixes);
  const output = hotspots
    .map(([file, score]) => {
      const roundedScore = round(score, 20);
      return `${String(roundedScore).padEnd(20, '0')}\t${file}`;
    })
    .join('\n');
  await fs.writeFile('hotspot.txt', output, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
