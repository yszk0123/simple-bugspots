import { BugspotsOptions } from '.';
import { Bugspots } from './Bugspots';
import { Git, GitCommit, GitDiff } from './Git';
import { Spot } from './Spot';

afterEach(() => {
  jest.resetAllMocks();
});

type TestCase = {
  title: string;
  input: {
    now: number;
    options?: Partial<BugspotsOptions>;
    commits: GitCommit[];
    diffList: Record<string, GitDiff[]>;
  };
  expected: Spot[];
};

function t(unixtime: number): string {
  return new Date(unixtime).toISOString();
}

const testcases: TestCase[] = [
  {
    title: 'empty',
    input: {
      now: 0,
      commits: [],
      diffList: {},
    },
    expected: [],
  },
  {
    title: 'zero fix',
    input: {
      now: 0,
      commits: [
        {
          message: 'initial commit',
          date: t(0),
          hash: '001',
        },
      ],
      diffList: {},
    },
    expected: [],
  },
  {
    title: 'one fix',
    input: {
      now: 2,
      commits: [
        {
          message: 'fix: foo',
          date: t(1),
          hash: '002',
        },
        {
          message: 'initial commit',
          date: t(0),
          hash: '001',
        },
      ],
      diffList: {
        '001..002': [{ status: 'A', src: 'foo.js' }],
      },
    },
    expected: [['foo.js', 0.000006144174602214718]],
  },
  {
    title: 'sorted',
    input: {
      now: 3,
      commits: [
        {
          message: 'fix: bar',
          date: t(2),
          hash: '003',
        },
        {
          message: 'fix: foo',
          date: t(1),
          hash: '002',
        },
        {
          message: 'initial commit',
          date: t(0),
          hash: '001',
        },
      ],
      diffList: {
        '001..002': [{ status: 'A', src: 'foo.js' }],
        '002..003': [{ status: 'A', src: 'bar.js' }],
      },
    },
    expected: [
      ['bar.js', 0.0024726231566347743],
      ['foo.js', 0.000006144174602214718],
    ],
  },
];

for (const { title, input, expected } of testcases) {
  test(title, async () => {
    jest.useFakeTimers({ now: input.now });
    const git = new (class extends Git {
      constructor() {
        super({ baseDir: '', maxConcurrentProcesses: 1 });
      }
      async getCommits(): Promise<GitCommit[]> {
        return input.commits;
      }
      async getDiff(oldHash: string, newHash: string): Promise<GitDiff[]> {
        return input.diffList[`${oldHash}..${newHash}`];
      }
    })();
    const buspots = new Bugspots(input.options, git);
    const spots = await buspots.scan();
    expect(spots).toEqual(expected);
  });
}
