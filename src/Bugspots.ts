import { Git } from './Git';
import { Progress } from './Progress';
import { Spot } from './Spot';
import { Fix } from './Fix';
import { Renamer } from './Renamer';
import { BugspotsOptions, bugspotsDefaultOptions } from './BugspotsOptions';
import { pairwise } from './utils/pairwise';
import { noop } from './utils/noop';
import { defaults } from './utils/defaults';
import pLimit from 'p-limit';

function calculateHotspots(fixes: Fix[]): Spot[] {
  const hotspots = new Map<string, number>();
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
  const sortedHotspots: Spot[] = Array.from(hotspots).sort(
    (a, b) => b[1] - a[1],
  );
  return sortedHotspots;
}

export class Bugspots {
  private options: BugspotsOptions;
  private git: Git;

  constructor(options: Partial<BugspotsOptions> = {}, git?: Git) {
    this.options = defaults(options, bugspotsDefaultOptions);
    this.git =
      git ??
      new Git({
        baseDir: this.options.baseDir,
        maxConcurrentProcesses: this.options.concurrency,
      });
  }

  async scan(): Promise<Spot[]> {
    const options = this.options;
    const git = this.git;

    const commits = await git.getCommits(options.depth);
    if (commits.length === 0) {
      return [];
    }

    const fixes: Fix[] = [];
    const limit = pLimit(options.concurrency);
    const total = commits.length - 1;
    const renamer = new Renamer();
    const progress = new Progress(total, options.interval, noop);

    progress.start();

    await Promise.all(
      pairwise(commits).map(([newCommit, oldCommit], commitIndex) =>
        limit(async () => {
          const diffList = await git.getDiff(oldCommit.hash, newCommit.hash);
          const files: string[] = [];

          for (const diff of diffList) {
            if (diff.status === 'R' && diff.similarity >= options.similarity) {
              renamer.add(commitIndex, diff.src, diff.dest);
            }
            files.push(diff.src);
          }

          if (options.regex.test(newCommit.message)) {
            fixes.push(
              new Fix(commitIndex, newCommit.message, newCommit.date, files),
            );
          }

          progress.tick();
        }),
      ),
    );

    if (fixes.length === 0) {
      return [];
    }

    renamer.applyRename(fixes);

    const hotspots = calculateHotspots(fixes);
    return hotspots;
  }
}
