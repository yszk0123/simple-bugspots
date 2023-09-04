import { SimpleGit, SimpleGitOptions, simpleGit } from 'simple-git';

export type GitCommit = { hash: string; date: string; message: string };

export type GitDiff =
  | { status: 'A' | 'M' | 'D'; src: string }
  | { status: 'R'; similarity: number; src: string; dest: string };

type GitOptions = Pick<SimpleGitOptions, 'baseDir' | 'maxConcurrentProcesses'>;

export class Git {
  private git: SimpleGit;

  constructor(options: GitOptions) {
    this.git = simpleGit(options);
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
