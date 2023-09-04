export class Fix {
  commitTime: number;

  constructor(
    public commitIndex: number,
    public message: string,
    commitDate: string,
    public files: string[],
  ) {
    this.commitTime = new Date(commitDate).getTime();
  }
}
